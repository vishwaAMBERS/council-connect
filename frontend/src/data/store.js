import { events as seedEvents, lostFoundItems as seedItems } from './mock.js';

const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const eventList = [...seedEvents];
export const lostFoundList = [...seedItems];

export function createEvent(data, user) {
  eventList.unshift({
    id: 'e' + Date.now(),
    title: data.title,
    tag: data.tag,
    date: data.date,
    time: data.time,
    venue: data.venue,
    organizer: user?.name || 'Student Council',
    poster: data.poster?.name || null,
    registrations: 0,
    capacity: Number(data.capacity) || 100,
    registered: false,
    saved: false,
    desc: data.desc,
  });
  notify();
}

export function postItem(data) {
  lostFoundList.unshift({
    id: 'l' + Date.now(),
    type: data.type,
    title: data.title,
    desc: data.desc,
    location: data.location,
    img: data.img?.name || null,
    matched: data.type === 'found',
  });
  notify();
}
