'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import { CloudSun, Code2, Lightbulb, PenLine } from 'lucide-react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { ChatMessage } from '@/lib/types';

interface SuggestedActionsProps {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  chatId,
  sendMessage,
  selectedVisibilityType,
}: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'What are the advantages',
      label: 'of using Next.js?',
      action: 'What are the advantages of using Next.js?',
      icon: Lightbulb,
    },
    {
      title: 'Write code to',
      label: `demonstrate djikstra's algorithm`,
      action: `Write code to demonstrate djikstra's algorithm`,
      icon: Code2,
    },
    {
      title: 'Help me write an essay',
      label: `about silicon valley`,
      action: `Help me write an essay about silicon valley`,
      icon: PenLine,
    },
    {
      title: 'What is the weather',
      label: 'in San Francisco?',
      action: 'What is the weather in San Francisco?',
      icon: CloudSun,
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              sendMessage({
                role: 'user',
                parts: [{ type: 'text', text: suggestedAction.action }],
              });
            }}
            className="group text-left border bg-card rounded-xl px-4 py-3.5 text-sm flex-1 gap-3 w-full h-auto justify-start items-start whitespace-normal transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <suggestedAction.icon aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{suggestedAction.title}</span>
              <span className="text-muted-foreground">
                {suggestedAction.label}
              </span>
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;

    return true;
  },
);
