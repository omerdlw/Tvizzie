export const CONFIG = {
  ANIMATION: {
    ease: [0.23, 1, 0.32, 1],
    duration: 0.45,
    type: 'tween',
  },
  VARIANTS: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 30 },
  },
  STYLES: {
    INNER_CONTAINER:
      'flex flex-col-reverse gap-2 ' +
      'md:flex-row md:h-auto md:w-full md:items-center md:justify-between md:space-x-3',
    LEFT_CONTAINER:
      'flex flex-col-reverse gap-2 w-full [&>*]:w-full ' +
      'md:flex-row md:pointer-events-auto md:w-full md:justify-end md:space-x-3 md:gap-0 md:[&>*]:w-auto',
    RIGHT_CONTAINER:
      'flex flex-col-reverse gap-2 w-full [&>*]:w-full ' +
      'md:flex-row md:pointer-events-auto md:w-full md:justify-start md:space-x-3 md:gap-0 md:[&>*]:w-auto',
    CONTAINER:
      'fixed right-0 left-0 h-auto w-full px-4' +
      'bottom-3 md:bottom-3 transition-all duration-500 ease-in-out',
    SPACER: 'hidden md:block h-auto w-[360px] shrink-0',
  },
}
