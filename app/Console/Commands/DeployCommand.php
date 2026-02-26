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
                            {--skip-git        : Skip local git push}
                            {--skip-backend    : Skip backend deploy}
                            {--skip-frontend   : Skip frontend build & deploy}
                            {--skip-migrate    : Skip database migrations}
                            {--dry-run         : Show what would be executed without running}';

    /**
     * The console command description.
     */
    protected $description = 'Deploy backend + frontend to the production server via SSH';

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
                $this->runLocal(
                    ['git', 'commit', '--allow-empty', '-m', 'auto deploy: ' . now()->toDateTimeString()],
                    'git commit',
                    $isDryRun
                );
                $this->runLocal(
                    ['git', 'push', 'origin', $config['branch']],
                    "git push origin {$config['branch']}",
                    $isDryRun
                );
            });

            if (! $result) {
                return self::FAILURE;
            }
        } else {
            $this->warn('  Skipping git push (--skip-git)');
            $this->newLine();
        }

        // ----------------------------------------------------------------
        // PHASE 2 — Remote: Backend deploy
        // ----------------------------------------------------------------
        if (! $this->option('skip-backend')) {
            $result = $this->runPhase('PHASE 2 — Remote Backend Deploy', function () use ($config, $isDryRun) {
                $this->runSsh($config, $this->buildBackendScript($config), $isDryRun);
            });

            if (! $result) {
                return self::FAILURE;
            }
        } else {
            $this->warn('  Skipping backend deploy (--skip-backend)');
            $this->newLine();
        }

        // ----------------------------------------------------------------
        // PHASE 3 — Remote: Frontend build & deploy
        // ----------------------------------------------------------------
        if (! $this->option('skip-frontend')) {
            $result = $this->runPhase('PHASE 3 — Remote Frontend Build & Deploy', function () use ($config, $isDryRun) {
                $this->runSsh($config, $this->buildFrontendScript($config), $isDryRun);
            });

            if (! $result) {
                return self::FAILURE;
            }
        } else {
            $this->warn('  Skipping frontend deploy (--skip-frontend)');
            $this->newLine();
        }

        // ----------------------------------------------------------------
        // PHASE 4 — Summary
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
            'host'          => 'DEPLOY_SSH_HOST',
            'user'          => 'DEPLOY_SSH_USER',
            'path'          => 'DEPLOY_PATH',
            'branch'        => 'DEPLOY_BRANCH',
            'domain'        => 'DEPLOY_DOMAIN',
        ];

        $config  = [];
        $missing = [];

        foreach ($required as $key => $envKey) {
            $value = env($envKey);
            if (empty($value)) {
                $missing[] = $envKey;
            } else {
                $config[$key] = $value;
            }
        }

        // Optional
        $config['ssh_key']       = env('DEPLOY_SSH_KEY', $this->defaultSshKeyPath());
        $config['ssh_port']      = (int) env('DEPLOY_SSH_PORT', 22);
        // Default: frontend is a subdirectory of the backend (monorepo structure)
        $config['frontend_path'] = env('DEPLOY_FRONTEND_PATH', ($config['path'] ?? '/var/www/livegrid/backend') . '/frontend');

        if (! empty($missing)) {
            $this->error('Missing required .env variables:');
            foreach ($missing as $var) {
                $this->line("  → {$var}");
            }
            return null;
        }

        return $config;
    }

    private function defaultSshKeyPath(): string
    {
        $home = PHP_OS_FAMILY === 'Windows'
            ? ($_SERVER['USERPROFILE'] ?? 'C:/Users/' . get_current_user())
            : ($_SERVER['HOME'] ?? '/root');

        return $home . '/.ssh/id_rsa';
    }

    // ====================================================================
    // Remote script builders
    // ====================================================================

    /**
     * Backend deploy script (9 steps).
     */
    private function buildBackendScript(array $config): string
    {
        return <<<BASH
        set -e

        echo "=============================="
        echo " BACKEND DEPLOY STARTED: \$(date)"
        echo "=============================="

        cd {$config['path']}

        echo "[1/9] git pull..."
        git pull origin {$config['branch']}

        echo "[2/9] composer install..."
        COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction

        echo "[3/9] artisan migrate..."
        php artisan migrate --force

        echo "[4/9] artisan db:seed..."
        php artisan db:seed --force || true

        echo "[5/9] clearing caches..."
        php artisan config:clear
        php artisan cache:clear
        php artisan route:clear
        php artisan view:clear

        echo "[6/9] warming caches..."
        php artisan config:cache
        php artisan route:cache

        echo "[7/9] optimize..."
        php artisan optimize

        echo "[8/9] storage:link..."
        php artisan storage:link || true

        echo "[9/9] permissions..."
        chown -R www-data:www-data {$config['path']}
        chmod -R 775 {$config['path']}/storage
        chmod -R 775 {$config['path']}/bootstrap/cache

        echo "=============================="
        echo " BACKEND DEPLOY COMPLETE: \$(date)"
        echo "=============================="
        BASH;
    }

    /**
     * Frontend build & deploy script.
     */
    private function buildFrontendScript(array $config): string
    {
        $frontendPath = $config['frontend_path'];
        $backendPath  = $config['path'];

        return <<<BASH
        set -e

        echo "=============================="
        echo " FRONTEND DEPLOY STARTED: \$(date)"
        echo "=============================="

        # --- Ensure Node 20 is available ---
        export NVM_DIR="\$HOME/.nvm"
        [ -s "\$NVM_DIR/nvm.sh" ] && \\. "\$NVM_DIR/nvm.sh"

        if ! command -v node &>/dev/null; then
            echo "[!] Node.js not found, installing via nvm..."
            curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
            export NVM_DIR="\$HOME/.nvm"
            \\. "\$NVM_DIR/nvm.sh"
            nvm install 20
            nvm use 20
            nvm alias default 20
        fi

        NODE_VER=\$(node --version)
        echo "  Node: \$NODE_VER"
        echo "  npm:  \$(npm --version)"

        # --- Pull latest frontend code ---
        echo "[1/4] git pull..."
        cd {$frontendPath}
        git pull origin {$config['branch']}

        # --- Install dependencies (ci for reproducible builds) ---
        echo "[2/4] npm ci..."
        npm ci --prefer-offline 2>/dev/null || npm install

        # --- Build ---
        echo "[3/4] npm run build..."
        npm run build

        # --- Permissions ---
        echo "[4/4] permissions..."
        chown -R www-data:www-data {$frontendPath}/dist

        echo ""
        echo "  dist size: \$(du -sh {$frontendPath}/dist | cut -f1)"
        echo "  dist files: \$(find {$frontendPath}/dist -type f | wc -l)"

        echo "=============================="
        echo " FRONTEND DEPLOY COMPLETE: \$(date)"
        echo "=============================="
        BASH;
    }

    // ====================================================================
    // Process runners
    // ====================================================================

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

    private function runSsh(array $config, string $script, bool $dryRun): void
    {
        $sshBin  = $this->findSshBinary();
        $sshArgs = $this->buildSshArgs($config, $sshBin);

        $this->logInfo('  → SSH ' . $config['user'] . '@' . $config['host']);

        if ($dryRun) {
            $this->line('    <fg=gray>[DRY] SSH remote_script</>');
            foreach (explode("\n", trim($script)) as $line) {
                $this->line("    <fg=gray>{$line}</>");
            }
            return;
        }

        $command = array_merge($sshArgs, ['bash -s']);

        $process = new Process($command, base_path(), null, $script, 900);
        $process->run(function (string $type, string $buffer) {
            foreach (explode("\n", trim($buffer)) as $line) {
                if ($line === '') {
                    continue;
                }
                $this->logOutput($line);
                $color = $type === Process::ERR ? 'red' : 'gray';
                $this->line("    <fg={$color}>{$line}</>");
            }
        });

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        $this->logSuccess('  ✓ SSH deploy complete');
    }

    private function buildSshArgs(array $config, string $sshBin): array
    {
        $args = [$sshBin];

        if (! empty($config['ssh_key']) && file_exists($config['ssh_key'])) {
            $args[] = '-i';
            $args[] = $config['ssh_key'];
        }

        $args[] = '-p';
        $args[] = (string) $config['ssh_port'];
        $args[] = '-o';
        $args[] = 'StrictHostKeyChecking=accept-new';
        $args[] = '-T';
        $args[] = $config['user'] . '@' . $config['host'];

        return $args;
    }

    private function findSshBinary(): string
    {
        $candidates = PHP_OS_FAMILY === 'Windows'
            ? ['C:\\Windows\\System32\\OpenSSH\\ssh.exe', 'C:\\Program Files\\Git\\usr\\bin\\ssh.exe', 'ssh']
            : ['/usr/bin/ssh', '/usr/local/bin/ssh', 'ssh'];

        foreach ($candidates as $path) {
            if ($path === 'ssh' || file_exists($path)) {
                return $path;
            }
        }

        return 'ssh';
    }

    // ====================================================================
    // Phase runner
    // ====================================================================

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

    private function writeLog(): void
    {
        $timestamp = now()->format('Y-m-d H:i:s');
        $content   = "[{$timestamp}]\n" . implode("\n", $this->log) . "\n\n";
        $logPath   = storage_path('logs/deploy.log');

        file_put_contents($logPath, $content, FILE_APPEND | LOCK_EX);
        $this->line("  📄 Log saved to: {$logPath}");
    }

    // ====================================================================
    // UI
    // ====================================================================

    private function printBanner(): void
    {
        $this->newLine();
        $this->line('<fg=cyan>╔══════════════════════════════════════════╗</>');
        $this->line('<fg=cyan>║    LARAVEL + REACT PRODUCTION DEPLOY     ║</>');
        $this->line('<fg=cyan>║    ' . now()->toDateTimeString() . '          ║</>');
        $this->line('<fg=cyan>╚══════════════════════════════════════════╝</>');
        $this->newLine();
    }

    private function printSummary(array $config): void
    {
        $this->newLine();
        $this->line('<fg=green>╔══════════════════════════════════════════╗</>');
        $this->line('<fg=green>║         FULL DEPLOY SUCCESSFUL ✅         ║</>');
        $this->line('<fg=green>╠══════════════════════════════════════════╣</>');
        $this->line('<fg=green>║</> Frontend: https://' . str_pad($config['domain'], 21) . '<fg=green>║</>');
        $this->line('<fg=green>║</> API    : https://' . str_pad($config['domain'] . '/api/v1', 22) . '<fg=green>║</>');
        $this->line('<fg=green>║</> Server : ' . str_pad($config['user'] . '@' . $config['host'], 30) . '<fg=green>║</>');
        $this->line('<fg=green>║</> Branch : ' . str_pad($config['branch'], 30) . '<fg=green>║</>');
        $this->line('<fg=green>║</> Time   : ' . str_pad(now()->toDateTimeString(), 30) . '<fg=green>║</>');
        $this->line('<fg=green>╚══════════════════════════════════════════╝</>');
        $this->newLine();

        $this->writeLog();
    }
}
