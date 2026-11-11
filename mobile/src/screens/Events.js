import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { useAuth } from '../auth';
import { api, assetUrl } from '../api';
import { formatDateTime } from '../format';
import { Badge, Body, Btn, Card, ChipSelect, Empty, ErrorNote, Loading, Muted, Row, Screen, Title, useApi } from '../ui';

const seats = (e) => (e.capacity ? `${e.registrationCount}/${e.capacity} registered` : `${e.registrationCount} registered`);
const scope = (e) => (e.branchScope === 'own_branch' && e.unit ? `${e.unit.code} only` : 'All branches');

export function EventsScreen({ navigation }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('upcoming');
  const list = useApi(tab === 'past' ? '/events?when=past' : '/events');
  const all = list.data?.events || [];
  const events = tab === 'mine' ? all.filter((e) => e.isRegistered || e.organizer.id === user.id) : all;

  return (
    <Screen source={list}>
      <ChipSelect
        value={tab}
        onChange={setTab}
        options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'mine', label: user.role === 'student' ? 'My registrations' : 'My events' }, { value: 'past', label: 'Past' }]}
      />
      <ErrorNote error={list.error} onRetry={list.reload} />
      {list.loading && !list.data ? (
        <Loading />
      ) : events.length === 0 && !list.error ? (
        <Empty title={tab === 'past' ? 'No past events' : tab === 'mine' ? 'Nothing here yet' : 'No upcoming events'} />
      ) : (
        events.map((e) => (
          <Card key={e.id} onPress={() => navigation.navigate('EventDetail', { eventId: e.id, title: e.title })} label={`${e.title}, ${formatDateTime(e.startsAt)}`}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Badge tone="gray">{scope(e)}</Badge>
              {e.isRegistered && <Badge tone="green">Registered</Badge>}
            </Row>
            <Title style={{ marginTop: 10 }}>{e.title}</Title>
            <Muted>{formatDateTime(e.startsAt)} · {e.venue}</Muted>
            <Muted>{e.organizer.fullName}{e.organizer.positionTitle ? ` · ${e.organizer.positionTitle}` : ''}</Muted>
            <Muted style={{ marginTop: 6 }}>{seats(e)}</Muted>
          </Card>
        ))
      )}
      {user.canCreateEvents && <Muted style={{ textAlign: 'center', marginTop: 8 }}>Events are created from the web app.</Muted>}
    </Screen>
  );
}

export function EventDetailScreen({ route }) {
  const { user } = useAuth();
  const detail = useApi(`/events/${route.params.eventId}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const event = detail.data?.event;
  const participants = detail.data?.participants;

  if (detail.loading && !event) return <Screen><Loading /></Screen>;
  if (!event) return <Screen><ErrorNote error={detail.error} onRetry={detail.reload} /></Screen>;

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await detail.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen source={detail}>
      {event.posterUrl ? <Image source={{ uri: assetUrl(event.posterUrl) }} style={{ width: '100%', height: 200, borderRadius: 16, marginBottom: 12 }} accessibilityLabel={`Poster for ${event.title}`} /> : null}
      <Card>
        <Row>
          <Badge tone="gray">{scope(event)}</Badge>
          {event.isPast && <Badge tone="gray">Finished</Badge>}
          {event.isFull && !event.isPast && <Badge tone="gold">Full</Badge>}
        </Row>
        <Title style={{ fontSize: 20, marginTop: 10 }}>{event.title}</Title>
        <Muted style={{ marginTop: 6 }}>{formatDateTime(event.startsAt)}</Muted>
        <Muted>{event.venue}</Muted>
        <Muted>{event.organizer.fullName}{event.organizer.positionTitle ? ` · ${event.organizer.positionTitle}` : ''}</Muted>
        <Muted style={{ marginTop: 6 }}>{seats(event)}</Muted>
        <Body style={{ marginTop: 12 }}>{event.description}</Body>
      </Card>

      <ErrorNote error={error} />

      {user.role === 'student' && !event.isPast && (
        event.isRegistered ? (
          <Card>
            <Badge tone="green">You are registered</Badge>
            <Btn title="Cancel registration" variant="ghost" style={{ marginTop: 12 }} disabled={busy} onPress={() => run(() => api.del(`/events/${event.id}/register`))} />
          </Card>
        ) : (
          <Btn title={event.isFull ? 'Event is full' : busy ? 'Registering…' : 'Register'} disabled={busy || event.isFull} onPress={() => run(() => api.post(`/events/${event.id}/register`))} />
        )
      )}

      {participants && (
        <Card>
          <Title>Participants ({participants.length}{participants.length ? `, ${participants.filter((p) => p.attended).length} attended` : ''})</Title>
          {participants.length === 0 ? <Muted style={{ marginTop: 8 }}>Nobody has registered yet.</Muted> : null}
          {participants.map((p) => (
            <Row key={p.id} style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '600' }}>{p.fullName}</Body>
                <Muted>{[p.unitCode, p.year && `Year ${p.year}`].filter(Boolean).join(' · ')}</Muted>
              </View>
              <Btn
                small
                variant={p.attended ? 'primary' : 'outline'}
                title={p.attended ? 'Attended' : 'Mark attended'}
                disabled={busy}
                onPress={() => run(() => api.patch(`/events/${event.id}/attendance`, { studentId: p.id, attended: !p.attended }))}
              />
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}
