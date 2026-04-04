import { globalEvents } from '@/core/constants/events';

const createEventEmitter = (eventType) => (data) =>
  globalEvents.emit(eventType, {
    timestamp: Date.now(),
    type: eventType,
    ...data,
  });
const createEventSubscriber = (eventType) => (callback) => globalEvents.subscribe(eventType, callback);

export const NAV_EVENTS = {
  DATA_SOURCE_SELECT: 'NAV_DATA_SOURCE_SELECT',
  NAVIGATE_START: 'NAV_NAVIGATE_START',
  NAVIGATE_END: 'NAV_NAVIGATE_END',
  UPDATE_BADGE: 'NAV_UPDATE_BADGE',
  UPDATE_ITEM: 'NAV_UPDATE_ITEM',
  ITEM_HOVER: 'NAV_ITEM_HOVER',
  ITEM_CLICK: 'NAV_ITEM_CLICK',
  ITEM_FOCUS: 'NAV_ITEM_FOCUS',
  UNREGISTER: 'NAV_UNREGISTER',
  NAVIGATE: 'NAV_NAVIGATE',
  REGISTER: 'NAV_REGISTER',
  COLLAPSE: 'NAV_COLLAPSE',
  EXPAND: 'NAV_EXPAND',
};

export const NAV_EVENT_HANDLERS = {
  selectDataSource: (key, value, sourceType) =>
    createEventEmitter(NAV_EVENTS.DATA_SOURCE_SELECT)({
      sourceType,
      value,
      key,
    }),
  itemHover: (item, index, isEntering) => createEventEmitter(NAV_EVENTS.ITEM_HOVER)({ item, index, isEntering }),
  navigateEnd: (to, from, duration) => createEventEmitter(NAV_EVENTS.NAVIGATE_END)({ to, from, duration }),
  updateBadge: (key, value, color = 'bg-primary') => createEventEmitter(NAV_EVENTS.UPDATE_BADGE)({ key, value, color }),
  register: (key, item, source) => createEventEmitter(NAV_EVENTS.REGISTER)({ key, item, source }),
  navigate: (to, from, item) => createEventEmitter(NAV_EVENTS.NAVIGATE)({ to, from, item }),
  navigateStart: (to, from) => createEventEmitter(NAV_EVENTS.NAVIGATE_START)({ to, from }),
  updateItem: (key, updates) => createEventEmitter(NAV_EVENTS.UPDATE_ITEM)({ key, updates }),
  unregister: (key, source) => createEventEmitter(NAV_EVENTS.UNREGISTER)({ key, source }),
  itemFocus: (item, index) => createEventEmitter(NAV_EVENTS.ITEM_FOCUS)({ item, index }),
  itemClick: (item, index) => createEventEmitter(NAV_EVENTS.ITEM_CLICK)({ item, index }),
  onDataSourceSelect: createEventSubscriber(NAV_EVENTS.DATA_SOURCE_SELECT),
  onNavigateStart: createEventSubscriber(NAV_EVENTS.NAVIGATE_START),
  onNavigateEnd: createEventSubscriber(NAV_EVENTS.NAVIGATE_END),
  onBadgeUpdate: createEventSubscriber(NAV_EVENTS.UPDATE_BADGE),
  onUpdateItem: createEventSubscriber(NAV_EVENTS.UPDATE_ITEM),
  onUnregister: createEventSubscriber(NAV_EVENTS.UNREGISTER),
  onItemHover: createEventSubscriber(NAV_EVENTS.ITEM_HOVER),
  onItemClick: createEventSubscriber(NAV_EVENTS.ITEM_CLICK),
  onItemFocus: createEventSubscriber(NAV_EVENTS.ITEM_FOCUS),
  onRegister: createEventSubscriber(NAV_EVENTS.REGISTER),
  onNavigate: createEventSubscriber(NAV_EVENTS.NAVIGATE),
  onCollapse: createEventSubscriber(NAV_EVENTS.COLLAPSE),
  onExpand: createEventSubscriber(NAV_EVENTS.EXPAND),
  collapse: createEventEmitter(NAV_EVENTS.COLLAPSE),
  expand: createEventEmitter(NAV_EVENTS.EXPAND),
};
