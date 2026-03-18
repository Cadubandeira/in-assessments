export const AVATAR_OPTIONS = [
  { key: 'rocket', emoji: '🚀', label: 'Explorador' },
  { key: 'spark', emoji: '✨', label: 'Inspirador' },
  { key: 'shield', emoji: '🛡️', label: 'Guardião' },
  { key: 'brain', emoji: '🧠', label: 'Estratégico' },
  { key: 'fire', emoji: '🔥', label: 'Determinado' },
  { key: 'wave', emoji: '🌊', label: 'Colaborativo' }
];

export const AVATAR_BG_OPTIONS = [
  { key: 'indigo', className: 'bg-indigo-500' },
  { key: 'violet', className: 'bg-violet-500' },
  { key: 'emerald', className: 'bg-emerald-500' },
  { key: 'sky', className: 'bg-sky-500' },
  { key: 'amber', className: 'bg-amber-500' },
  { key: 'rose', className: 'bg-rose-500' }
];

export const DEFAULT_AVATAR_KEY = AVATAR_OPTIONS[0].key;
export const DEFAULT_AVATAR_BG = AVATAR_BG_OPTIONS[0].key;

export const getAvatarOption = (avatarKey) => AVATAR_OPTIONS.find((option) => option.key === avatarKey) || AVATAR_OPTIONS[0];

export const getAvatarBgClass = (colorKey) => {
  const match = AVATAR_BG_OPTIONS.find((option) => option.key === colorKey);
  return match?.className || AVATAR_BG_OPTIONS[0].className;
};
