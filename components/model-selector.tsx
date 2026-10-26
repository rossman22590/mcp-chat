'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';
import useSWR from 'swr';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type ChatModel, DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

export function ModelSelector({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const { data: availableModels } = useSWR<Array<ChatModel>>('/api/models', (url: string) =>
    fetch(url).then((r) => r.json()),
    { dedupingInterval: 3_600_000 }
  );

  const models = availableModels?.length ? availableModels : chatModels;

  // The server falls back to the default model when the saved one is no
  // longer offered, so show that here too
  const selectedChatModel = useMemo(
    () =>
      models.find((m) => m.id === optimisticModelId) ??
      models.find((m) => m.id === DEFAULT_CHAT_MODEL),
    [optimisticModelId, models],
  );

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return models;
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(normalizedQuery) ||
        m.id.toLowerCase().includes(normalizedQuery),
    );
  }, [query, models]);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setQuery('');
      }}
    >
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          data-testid="model-selector"
          variant="outline"
          className="md:px-2 md:h-[34px]"
        >
          {selectedChatModel?.name ?? optimisticModelId}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[300px] max-w-[calc(100vw-2rem)] max-h-[min(70vh,520px)] overflow-y-auto p-0"
      >
        <div className="sticky top-0 z-10 bg-popover p-1 border-b">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            // Keep the menu's typeahead from stealing keystrokes
            onKeyDown={(event) => {
              if (event.key !== 'ArrowDown' && event.key !== 'Escape') {
                event.stopPropagation();
              }
            }}
            placeholder={`Search ${models.length} models...`}
            className="h-8"
          />
        </div>
        {filteredModels.length === 0 && (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            No models found
          </div>
        )}
        <div className="p-1">
          {filteredModels.map((chatModel) => {
            const { id } = chatModel;

            return (
              <DropdownMenuItem
                data-testid={`model-selector-item-${id}`}
                key={id}
                onSelect={() => {
                  setOpen(false);

                  startTransition(() => {
                    setOptimisticModelId(id);
                    saveChatModelAsCookie(id);
                  });
                }}
                data-active={id === optimisticModelId}
                asChild
              >
                <button
                  type="button"
                  className="gap-4 group/item flex flex-row justify-between items-center w-full"
                >
                  <div className="flex flex-col gap-1 items-start">
                    <div>{chatModel.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {chatModel.description}
                    </div>
                  </div>

                  <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                    <CheckCircleFillIcon />
                  </div>
                </button>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
