import React, { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import LeafletMap from '../LeafletMap';
import { useAuth } from '../auth';
import { api } from '../api';
import { formatDateTime, timeAgo } from '../format';
import { Badge, Body, Btn, Card, ChipSelect, Empty, ErrorNote, Loading, Muted, Row, Screen, Title, colors, useApi } from '../ui';

// Where a notification's web link leads inside this app: [tab or stack screen, params].
function routeForLink(link = '') {
  const [path, queryString = ''] = link.split('?');
  const query = Object.fromEntries(queryString.split('&').filter(Boolean).map((pair) => pair.split('=')));
  // Tab screens live inside the "Tabs" navigator, so they are addressed through it.
  if (path === '/messages' && query.request) {
    return ['Tabs', { screen: 'Inbox', params: { screen: 'Thread', params: { requestId: query.request }, initial: false } }];
  }
  if (path.startsWith('/grievances/')) return ['GrievanceDetail', { grievanceId: path.split('/')[2] }];
  if (path === '/lost-found' && query.match) return ['MatchThread', { matchId: query.match }];
  if (path === '/lost-found') return ['LostFound'];
  if (path === '/events') return ['Tabs', { screen: 'Events' }];
  if (path === '/profile') return ['Tabs', { screen: 'Profile' }];
  return null;
}

export function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const feed = useApi('/notifications', { pollMs: 30000 });
  const events = useApi('/events');
  const unread = feed.data?.unreadCount || 0;
  const next = (events.data?.events || []).slice(0, 2);

  const links = [
    ['Grievances', 'Hostel complaints', user.canHandleGrievances ? 'Work the complaint queue' : 'Submit and track a complaint'],
    ['LostFound', 'Lost & found', 'Report an item and see matches'],
    ['CampusMap', 'Campus map', 'Departments, hostels, venues'],
  ];

  return (
    <Screen source={feed}>
      <Title style={{ fontSize: 24 }}>Hello, {user.fullName.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]}</Title>
      <Muted style={{ marginBottom: 16 }}>{user.unit ? user.unit.name : 'GECA'}</Muted>

      <Card onPress={() => navigation.navigate('Notifications')} label={`Notifications, ${unread} unread`}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title>Notifications</Title>
          {unread > 0 ? <Badge tone="red">{unread} new</Badge> : <Muted>All read</Muted>}
        </Row>
        {(feed.data?.notifications || []).slice(0, 2).map((n) => (
          <Muted key={n.id} numberOfLines={1} style={{ marginTop: 6 }}>{n.title}</Muted>
        ))}
      </Card>

      {links.map(([screen, title, desc]) => (
        <Card key={screen} onPress={() => navigation.navigate(screen)} label={title}>
          <Title>{title}</Title>
          <Muted>{desc}</Muted>
        </Card>
      ))}

      {next.length > 0 && (
        <>
          <Title style={{ marginTop: 8, marginBottom: 10 }}>Coming up</Title>
          {next.map((e) => (
            <Card key={e.id} onPress={() => navigation.navigate('Events', { screen: 'EventDetail', params: { eventId: e.id, title: e.title }, initial: false })} label={e.title}>
              <Title style={{ fontSize: 15 }}>{e.title}</Title>
              <Muted>{formatDateTime(e.startsAt)} · {e.venue}</Muted>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

export function NotificationsScreen({ navigation }) {
  const feed = useApi('/notifications');
  const items = feed.data?.notifications || [];
  const unread = feed.data?.unreadCount || 0;

  // Opening the list counts as reading it; rows keep their "new" mark until the screen is reopened.
  useEffect(() => {
    if (unread > 0) api.post('/notifications/read').catch(() => {});
  }, [unread]);

  return (
    <Screen source={feed}>
      <ErrorNote error={feed.error} onRetry={feed.reload} />
      {feed.loading && !feed.data ? (
        <Loading />
      ) : items.length === 0 && !feed.error ? (
        <Empty title="Nothing yet" desc="Updates on your requests, complaints, events and lost items appear here." />
      ) : (
        items.map((n) => {
          const target = routeForLink(n.link);
          return (
            <Card key={n.id} onPress={target ? () => navigation.navigate(...target) : undefined} label={n.title} style={n.read ? undefined : { backgroundColor: colors.blueSoft }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Title style={{ fontSize: 15, flex: 1 }}>{n.title}</Title>
                {!n.read && <Badge tone="red">New</Badge>}
              </Row>
              {n.body ? <Body style={{ fontSize: 13 }} numberOfLines={2}>{n.body}</Body> : null}
              <Muted>{timeAgo(n.createdAt)}</Muted>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const TYPE_LABEL = { department: 'Departments', hostel: 'Hostels', office: 'Offices', venue: 'Venues', facility: 'Facilities' };
const TYPE_COLOR = { department: '#2266ED', hostel: '#1d7a46', office: '#c0392b', venue: '#c8963e', facility: '#6b4fbb' };

export function CampusMapScreen() {
  const map = useApi('/map');
  const [filter, setFilter] = useState('all');
  const locations = map.data?.locations || [];
  const eventsAt = (id) => (map.data?.events || []).filter((e) => e.locationId === id);
  const itemsAt = (id) => (map.data?.items || []).filter((i) => i.locationId === id);

  const shown = locations.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'events') return eventsAt(l.id).length > 0;
    if (filter === 'lost_found') return itemsAt(l.id).length > 0;
    return l.type === filter;
  });
  const linesFor = (l) => [
    ...eventsAt(l.id).map((e) => `Event: ${e.title}, ${formatDateTime(e.startsAt)}`),
    ...itemsAt(l.id).map((i) => `${i.type === 'lost' ? 'Lost' : 'Found'}: ${i.title}`),
  ];
  const places = shown.map((l) => ({ name: l.name, lat: l.lat, lng: l.lng, color: TYPE_COLOR[l.type], lines: linesFor(l), busy: linesFor(l).length > 0 }));

  // Opens the phone's maps app (or OpenStreetMap in the browser) at this place.
  const openInMaps = (l) => {
    const label = encodeURIComponent(l.name);
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${l.lat},${l.lng}&q=${label}`,
      android: `geo:${l.lat},${l.lng}?q=${l.lat},${l.lng}(${label})`,
      default: `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=18/${l.lat}/${l.lng}`,
    });
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Screen source={map}>
      <ChipSelect
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: 'All' }, ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })), { value: 'events', label: 'Event venues' }, { value: 'lost_found', label: 'Lost & found' }]}
      />
      <ErrorNote error={map.error} onRetry={map.reload} />
      {map.loading && !map.data ? <Loading /> : null}

      {/* Interactive map on phones; the list below works everywhere. */}
      <LeafletMap places={places} />

      {map.data && shown.length === 0 ? <Empty title="No places for this filter" /> : null}
      {shown.map((l) => (
        <Card key={l.id}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <Row style={{ flexWrap: 'nowrap' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: TYPE_COLOR[l.type] }} />
                <Title style={{ fontSize: 15, flex: 1 }}>{l.name}</Title>
              </Row>
              {l.description ? <Muted>{l.description}</Muted> : null}
              {linesFor(l).map((line) => <Body key={line} style={{ fontSize: 13, marginTop: 4 }}>{line}</Body>)}
            </View>
            <Btn small variant="outline" title="Directions" onPress={() => openInMaps(l)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
