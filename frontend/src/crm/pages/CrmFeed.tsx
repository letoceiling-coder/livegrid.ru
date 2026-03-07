import { useState } from 'react';
import { crmRunFeed } from '@/crm/api';
import { Button } from '@/components/ui/button';

const COMMANDS = [
  'feed:collect',
  'feed:inspect',
  'feed:analyze',
  'feed:sync',
  'catalog:sync-from-legacy',
] as const;

export default function CrmFeed() {
  const [command, setCommand] = useState<typeof COMMANDS[number]>('feed:sync');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setOutput('');
    try {
      const result = await crmRunFeed(command);
      setOutput(result.output || 'Команда выполнена без вывода');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка запуска команды feed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-4">Обновление Feed</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Ручной запуск команд получения и синхронизации данных из внешнего feed.
      </p>

      <div className="rounded-2xl border bg-background p-4 flex flex-wrap gap-2 items-center mb-4">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={command}
          onChange={e => setCommand(e.target.value as typeof COMMANDS[number])}
        >
          {COMMANDS.map(cmd => (
            <option key={cmd} value={cmd}>{cmd}</option>
          ))}
        </select>
        <Button onClick={() => void run()} disabled={loading}>
          {loading ? 'Выполняем...' : 'Запустить'}
        </Button>
      </div>

      {error && <div className="text-sm text-destructive mb-4">{error}</div>}

      <div className="rounded-2xl border bg-background p-4">
        <div className="text-sm font-medium mb-2">Вывод команды</div>
        <pre className="text-xs whitespace-pre-wrap max-h-[60vh] overflow-auto">
          {output || 'Нет вывода'}
        </pre>
      </div>
    </div>
  );
}

