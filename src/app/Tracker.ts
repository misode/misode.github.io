const event = (category: string, action: string, label?: string) => 
  ga('send', 'event', category, action, label)

const dimension = (index: number, value: string) => 
  ga('set', `dimension${index}`, value);

export const Tracker = {
  setTheme: (theme: string) => event('Generator', 'set-theme', theme),
  setVersion: (version: string) => event('Generator', 'set-version', version),
  setPreview: (name: string) => event('Preview', 'set-preview', name),
  setLanguage: (language: string) => event('Generator', 'set-language', language),
  reset: () => event('Generator', 'reset'),
  undo: (hotkey = false) => event('Generator', 'undo', hotkey ? 'Hotkey' : 'Menu'),
  redo: (hotkey = false) => event('Generator', 'redo', hotkey ? 'Hotkey' : 'Menu'),
  copy: () => event('JsonOutput', 'copy'),
  download: () => event('JsonOutput', 'download'),
  share: () => event('JsonOutput', 'share'),
  toggleErrors: (visible: boolean) => event('Errors', 'toggle', visible ? 'visible' : 'hidden'),
  hidePreview: () => event('Preview', 'hide-preview'),

  dimTheme: (theme: string) => dimension(1, theme),
  dimLanguage: (language: string) => dimension(3, language),
  dimVersion: (version: string) => dimension(4, version),
  dimPreview: (preview: string) => dimension(5, preview),
}
