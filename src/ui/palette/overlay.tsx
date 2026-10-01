import { useEffect, useSyncExternalStore, type AnimationEvent } from 'react';
import { useSettings } from '../hooks/use-settings';
import { useResolvedTheme } from '../hooks/use-theme';
import { cn } from '../lib/cn';
import type { OverlayController } from './overlay-controller';
import { Palette } from './palette';

interface OverlayProps {
  controller: OverlayController;
  domRoot: Node;
}

/** The palette floating over a web page, rendered inside a shadow root. */
export function Overlay({ controller, domRoot }: OverlayProps) {
  const { phase, session } = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const settings = useSettings();
  const theme = useResolvedTheme(settings.theme);

  // Like a native launcher: leaving the window or the tab dismisses it.
  useEffect(() => {
    if (phase !== 'open') return;
    const onBlur = () => controller.close();
    const onVisibility = () => {
      if (document.hidden) {
        controller.close();
        controller.finishClose();
      }
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase, controller]);

  if (phase === 'closed') return null;

  const onAnimationEnd = (event: AnimationEvent) => {
    if (phase === 'closing' && event.target === event.currentTarget) controller.finishClose();
  };

  return (
    <div
      data-state={phase}
      className={cn('fixed inset-0 z-[2147483647] font-sans text-[14px] leading-normal antialiased', theme === 'dark' && 'dark')}
      style={{ colorScheme: theme, ['--hop-list-max-height' as string]: 'min(420px, 58vh)' }}
    >
      <div className="hop-backdrop absolute inset-0" data-blur={settings.blurBackdrop} onMouseDown={controller.close} />
      <div className="pointer-events-none absolute inset-x-0 top-[14vh] flex justify-center px-4">
        <div className="hop-panel pointer-events-auto w-full max-w-[640px]" onAnimationEnd={onAnimationEnd}>
          <Palette
            key={session}
            variant="overlay"
            onClose={controller.close}
            domRoot={domRoot}
            takeTypedInput={controller.takeTypedInput}
          />
        </div>
      </div>
    </div>
  );
}
