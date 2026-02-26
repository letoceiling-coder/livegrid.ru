<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

class DeployCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'deploy
                            {--skip-git : Skip local git push}
                            {--skip-migrate : Skip database migrations}
                            {--dry-run : Show what would be executed without running}';

    /**
     * The console command description.
     */
    protected $description = 'Deploy the application to the production server via SSH';

    /** Collected log lines */
    private array $log = [];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->printBanner();

        // ----------------------------------------------------------------
        // Validate configuration
        // ----------------------------------------------------------------
        $config = $this->resolveConfig();
        if ($config === null) {
            return self::FAILURE;
        }

        $isDryRun = (bool) $this->option('dry-run');

        if ($isDryRun) {
            $this->warn('  [DRY-RUN] No commands will actually be executed.');
            $this->newLine();
        }

        // ----------------------------------------------------------------
        // PHASE 1 — Local: git push
        // ----------------------------------------------------------------
        if (! $this->option('skip-git')) {
            $result = $this->runPhase('PHASE 1 — Local Git Push', function () use ($config, $isDryRun) {
                $this->runLocal(['git', 'add', '.'], 'git add .', $isDryRun);
                $this->runLocal(['git', 'commit', '--allow-empty', '-m', 'auto deploy: ' . now()->toDateTimeString()], 'git commit', $isDryRun);
                $this->runLocal(['git', 'push', 'origin', $config['branch']], "git push origin {$config['branch']}", $isDryRun);
            });

            if (! $result) {
                return self::FAILURE;
            }
        } else {
            $this->warn('  Skipping git push (--skip-git flag)');
            $this->newLine();
        }

        // ----------------------------------------------------------------
        // PHASE 2 — Remote: deploy over SSH
        // ----------------------------------------------------------------
        $result = $this->runPhase('PHASE 2 — Remote Deploy via SSH', function () use ($config, $isDryRun) {
            $remoteCommands = $this->buildRemoteScript($config);
            $this->runSsh($config, $remoteCommands, $isDryRun);
        });

        if (! $result) {
            return self::FAILURE;
        }

        // ----------------------------------------------------------------
        // PHASE 3 — Summary
        // ----------------------------------------------------------------
        $this->printSummary($config);

        return self::SUCCESS;
    }

    // ====================================================================
    // Configuration
    // ====================================================================

    /**
     * Resolve and validate required environment variables.
     */
    private function resolveConfig(): ?array
    {
        $required = [
            'host'   => 'DEPLOY_SSH_HOST',
            'user'   => 'DEPLOY_SSH_USER',
            'path'   => 'DEPLOY_PATH',
            'branch' => 'DEPLOY_BRANCH',
            'domain' => 'DEPLOY_DOMAIN',
        ];

        $config = [];
        $missing = [];

        foreach ($required as $key => $envKey) {
            $value = env($envKey);
            if (empty($value)) {
                $missing[] = $envKey;
            } else {
                $config[$key] = $value;
            }
        }

        // Optional: path to SSH key
        $config['ssh_key'] = env('DEPLOY_SSH_KEY', $this->defaultSshKeyPath());
        $config['ssh_port'] = (int) env('DEPLOY_SSH_PORT', 22);

        if (! empty($missing)) {
            $this->error('Missing required .env variables:');
            foreach ($missing as $var) {
                $this->line("  → {$var}");
            }
            return null;
        }

        return $config;
    }

    /**
     * Detect default SSH key path.
     */
    private function defaultSshKeyPath(): string
    {
        $home = PHP_OS_FAMILY === 'Windows'
            ? ($_SERVER['USERPROFILE'] ?? 'C:/Users/' . get_current_user())
            : ($_SERVER['HOME'] ?? '/root');

        return $home . '/.ssh/id_rsa';
    }

    // ====================================================================
    // Remote script builder
    // ====================================================================

    /**
     * Build the multi-line shell script to run on the remote server.
     */
    private function buildRemoteScript(array $config): string
    {
        $path   = escapeshellarg($config['path']);
        $branch = escapeshellarg($config['branch']);

        // Each group is separated by a comment so logs are clear.
        return <<<BASH
        set -e

        echo "=============================="
        echo " DEPLOY STARTED: \$(date)"
        echo "=============================="

        # --- Pull latest code ---
        echo "[1/9] git pull..."
        cd {$config['path']}
        git pull origin {$config['branch']}

        # --- Install dependencies ---
        echo "[2/9] composer install..."
        composer install --no-dev --optimize-autoloader --no-interaction

        # --- Migrate ---
        echo "[3/9] artisan migrate..."
        php artisan migrate --force

        # --- Seed (non-fatal) ---
        echo "[4/9] artisan db:seed..."
        php artisan db:seed --force || true

        # --- Clear all caches ---
        echo "[5/9] clearing caches..."
        php artisan config:clear
        php artisan cache:clear
        php artisan route:clear
        php artisan view:clear

        # --- Warm up caches ---
        echo "[6/9] caching config & routes..."
        php artisan config:cache
        php artisan route:cache

        # --- Optimize ---
        echo "[7/9] optimize..."
        php artisan optimize

        # --- Storage link (non-fatal) ---
        echo "[8/9] storage:link..."
        php artisan storage:link || true

        # --- Permissions ---
        echo "[9/9] permissions..."
        chmod -R 775 storage
        chmod -R 775 bootstrap/cache

        echo "=============================="
        echo " DEPLOY COMPLETE: \$(date)"
        echo "=============================="
        BASH;
    }

    // ====================================================================
    // Process runners
    // ====================================================================

    /**
     * Run a local process via Symfony Process.
     */
    private function runLocal(array $command, string $label, bool $dryRun): void
    {
        $this->logInfo("  → {$label}");

        if ($dryRun) {
            $this->line('    <fg=gray>[DRY] ' . implode(' ', $command) . '</>');
            return;
        }

        $process = new Process($command, base_path(), null, null, 120);
        $process->run(function (string $type, string $buffer) {
            foreach (explode("\n", trim($buffer)) as $line) {
                if ($line === '') {
                    continue;
                }
                $this->logOutput($line);
                $this->line("    <fg=gray>{$line}</>");
            }
        });

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        $this->logSuccess("  ✓ {$label}");
    }

    /**
     * Run commands on the remote server via SSH (Symfony Process, no exec).
     */
    private function runSsh(array $config, string $script, bool $dryRun): void
    {
        $sshBin = $this->findSshBinary();

        $sshArgs = $this->buildSshArgs($config, $sshBin);

        $this->logInfo('  → SSH connection to ' . $config['user'] . '@' . $config['host']);

        if ($dryRun) {
            $this->line('    <fg=gray>[DRY] ' . implode(' ', $sshArgs) . ' <remote_script></>');
            $this->line('    <fg=gray>--- remote script preview ---</>');
            foreach (explode("\n", trim($script)) as $line) {
                $this->line("    <fg=gray>{$line}</>");
            }
            return;
        }

        // Pass the script via stdin (-T flag disables pseudo-TTY, allows stdin piping)
        $command = array_merge($sshArgs, ['bash -s']);

        $process = new Process(
            $command,
            base_path(),
            null,
            $script,
            600 // 10-minute timeout for full deploy
        );

        $process->run(function (string $type, string $buffer) {
            foreach (explode("\n", trim($buffer)) as $line) {
                if ($line === '') {
                    continue;
                }
                $this->logOutput($line);

                $isError = $type === Process::ERR;
                $color   = $isError ? 'red' : 'gray';
                $this->line("    <fg={$color}>{$line}</>");
            }
        });

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        $this->logSuccess('  ✓ SSH deploy complete');
    }

    /**
     * Build the SSH command array.
     */
    private function buildSshArgs(array $config, string $sshBin): array
    {
        $args = [$sshBin];

        // Use SSH key authentication (never password)
        if (! empty($config['ssh_key']) && file_exists($config['ssh_key'])) {
            $args[] = '-i';
            $args[] = $config['ssh_key'];
        }

        $args[] = '-p';
        $args[] = (string) $config['ssh_port'];

        // Disable strict host key checking for automated deploys (safe with known server)
        $args[] = '-o';
        $args[] = 'StrictHostKeyChecking=accept-new';

        // Disable pseudo-TTY so we can pipe stdin
        $args[] = '-T';

        $args[] = $config['user'] . '@' . $config['host'];

        return $args;
    }

    /**
     * Find the SSH binary path.
     */
    private function findSshBinary(): string
    {
        // On Windows with Git for Windows / OpenSSH
        $candidates = PHP_OS_FAMILY === 'Windows'
            ? [
                'C:\\Windows\\System32\\OpenSSH\\ssh.exe',
                'C:\\Program Files\\Git\\usr\\bin\\ssh.exe',
                'ssh',
            ]
            : ['/usr/bin/ssh', '/usr/local/bin/ssh', 'ssh'];

        foreach ($candidates as $path) {
            if ($path === 'ssh' || file_exists($path)) {
                return $path;
            }
        }

        return 'ssh';
    }

    // ====================================================================
    // Phase runner (catch/display errors)
    // ====================================================================

    /**
     * Run a phase closure, catching exceptions and reporting status.
     */
    private function runPhase(string $name, callable $phase): bool
    {
        $this->comment("┌─ {$name}");

        try {
            $phase();
            $this->info("└─ ✅ SUCCESS: {$name}");
            $this->newLine();
            return true;
        } catch (\Throwable $e) {
            $this->error("└─ ❌ FAILED: {$name}");
            $this->error('   Error: ' . $e->getMessage());
            $this->newLine();
            $this->writeLog();
            return false;
        }
    }

    // ====================================================================
    // Logging
    // ====================================================================

    private function logInfo(string $line): void
    {
        $this->log[] = '[INFO] ' . $line;
        $this->line($line);
    }

    private function logSuccess(string $line): void
    {
        $this->log[] = '[OK]   ' . $line;
        $this->info($line);
    }

    private function logOutput(string $line): void
    {
        $this->log[] = '[OUT]  ' . $line;
    }

    /**
     * Write collected log to storage/logs/deploy.log.
     */
    private function writeLog(): void
    {
        $timestamp = now()->format('Y-m-d H:i:s');
        $content   = "[{$timestamp}]\n" . implode("\n", $this->log) . "\n\n";
        $logPath   = storage_path('logs/deploy.log');

        file_put_contents($logPath, $content, FILE_APPEND | LOCK_EX);
        $this->line("  📄 Log saved to: {$logPath}");
    }

    // ====================================================================
    // UI helpers
    // ====================================================================

    private function printBanner(): void
    {
        $this->newLine();
        $this->line('<fg=cyan>╔══════════════════════════════════════════╗</>');
        $this->line('<fg=cyan>║       LARAVEL PRODUCTION DEPLOY          ║</>');
        $this->line('<fg=cyan>║       ' . now()->toDateTimeString() . '          ║</>');
        $this->line('<fg=cyan>╚══════════════════════════════════════════╝</>');
        $this->newLine();
    }

    private function printSummary(array $config): void
    {
        $this->newLine();
        $this->line('<fg=green>╔══════════════════════════════════════════╗</>');
        $this->line('<fg=green>║            DEPLOY SUCCESSFUL ✅           ║</>');
        $this->line('<fg=green>╠══════════════════════════════════════════╣</>');
        $this->line('<fg=green>║</>  Domain  : https://' . str_pad($config['domain'], 21) . '<fg=green>║</>');
        $this->line('<fg=green>║</>  Server  : ' . str_pad($config['user'] . '@' . $config['host'], 29) . '<fg=green>║</>');
        $this->line('<fg=green>║</>  Branch  : ' . str_pad($config['branch'], 29) . '<fg=green>║</>');
        $this->line('<fg=green>║</>  Path    : ' . str_pad($config['path'], 29) . '<fg=green>║</>');
        $this->line('<fg=green>║</>  Time    : ' . str_pad(now()->toDateTimeString(), 29) . '<fg=green>║</>');
        $this->line('<fg=green>╚══════════════════════════════════════════╝</>');
        $this->newLine();

        $this->writeLog();
    }
}
