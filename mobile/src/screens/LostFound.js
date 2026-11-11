import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useAuth } from '../auth';
import { api, assetUrl } from '../api';
import { formatDateTime, STATUS_TONE, timeAgo, titleCase } from '../format';
import { Badge, Body, Btn, Bubbles, Card, ChipSelect, Empty, ErrorNote, Field, Loading, Muted, Row, Screen, Title, useApi } from '../ui';

const TypeBadge = ({ type }) => <Badge tone={type === 'lost' ? 'gold' : 'green'}>{type === 'lost' ? 'Lost' : 'Found'}</Badge>;

export function LostFoundScreen({ navigation }) {
  const [tab, setTab] = useState('all');
  const items = useApi('/lost-found', { pollMs: 30000 });
  const matches = useApi('/lost-found/matches', { pollMs: 30000 });
  const [error, setError] = useState(null);
  const all = items.data?.items || [];
  const myMatches = matches.data?.matches || [];
  const list = tab === 'mine' ? all.filter((i) => i.isMine) : all.filter((i) => i.status !== 'resolved' && (tab === 'all' || i.type === tab));
  const matchesFor = (item) => myMatches.filter((m) => m.lost.id === item.id || m.found.id === item.id);

  const resolve = async (item) => {
    setError(null);
    try {
      await api.post(`/lost-found/${item.id}/resolve`);
      await items.reload();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <Screen source={items}>
      <Btn title="Report a lost or found item" onPress={() => navigation.navigate('LostFoundNew')} style={{ marginBottom: 14 }} />
      <ChipSelect
        value={tab}
        onChange={setTab}
        options={[{ value: 'all', label: 'All' }, { value: 'lost', label: 'Lost' }, { value: 'found', label: 'Found' }, { value: 'mine', label: `My reports${myMatches.length ? ` (${myMatches.length} match${myMatches.length > 1 ? 'es' : ''})` : ''}` }]}
      />
      <ErrorNote error={error || items.error} onRetry={items.reload} />
      {items.loading && !items.data ? (
        <Loading />
      ) : list.length === 0 && !items.error ? (
        <Empty title={tab === 'mine' ? 'You have not posted anything' : 'No open reports'} />
      ) : (
        list.map((item) => (
          <Card key={item.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row>
                <TypeBadge type={item.type} />
                {item.status !== 'open' && <Badge tone={STATUS_TONE[item.status]}>{titleCase(item.status)}</Badge>}
                {item.isMine && <Badge>Yours</Badge>}
              </Row>
              <Muted>{timeAgo(item.createdAt)}</Muted>
            </Row>
            {item.imageUrl ? <Image source={{ uri: assetUrl(item.imageUrl) }} style={{ width: '100%', height: 160, borderRadius: 12, marginTop: 10 }} accessibilityLabel={`Photo of ${item.title}`} /> : null}
            <Title style={{ marginTop: 10 }}>{item.title}</Title>
            <Body>{item.description}</Body>
            <Muted style={{ marginTop: 6 }}>{item.location}{item.isMine ? '' : ` · ${item.postedByName}`}</Muted>
            {item.isMine && (
              <Row style={{ marginTop: 12 }}>
                {matchesFor(item).map((m) => (
                  <Btn key={m.id} small title={`Possible match: ${m.otherPartyName}${m.messageCount ? ` (${m.messageCount})` : ''}`} onPress={() => navigation.navigate('MatchThread', { matchId: m.id })} />
                ))}
                {item.status !== 'resolved' && <Btn small variant="ghost" title="Mark resolved" onPress={() => resolve(item)} />}
              </Row>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

export function LostFoundNewScreen({ navigation }) {
  const places = useApi('/locations');
  const [form, setForm] = useState({ type: 'lost', title: '', description: '', locationId: '', location: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const ready = form.title.trim() && form.description.trim() && (form.locationId || form.location.trim());

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/lost-found', {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        locationId: form.locationId || undefined,
        location: form.location.trim() || undefined,
      });
      navigation.goBack(); // the list reloads on focus and shows any match on the new report
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen>
        <ErrorNote error={error || places.error} />
        <ChipSelect label="Type" value={form.type} onChange={set('type')} options={[{ value: 'lost', label: 'I lost an item' }, { value: 'found', label: 'I found an item' }]} />
        <Field label="Item" value={form.title} onChangeText={set('title')} maxLength={100} placeholder="e.g. Blue water bottle" />
        <Field label="Description" hint="Colour, brand, marks. These details are what reports are matched on." value={form.description} onChangeText={set('description')} maxLength={500} multiline />
        <ChipSelect
          label={form.type === 'lost' ? 'Last seen at' : 'Found at'}
          value={form.locationId}
          onChange={set('locationId')}
          options={[{ value: '', label: 'Somewhere else' }, ...(places.data?.locations || []).map((l) => ({ value: l.id, label: l.name }))]}
        />
        {!form.locationId && <Field label="Place" value={form.location} onChangeText={set('location')} maxLength={120} placeholder="e.g. Bus stop near gate 2" />}
        <Btn title={busy ? 'Posting…' : 'Post report'} disabled={busy || !ready} onPress={submit} />
        <Muted style={{ marginTop: 12 }}>To attach a photo, post from the web app.</Muted>
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Private conversation between the two people whose reports were matched. */
export function MatchThreadScreen({ route }) {
  const { user } = useAuth();
  const { matchId } = route.params;
  const thread = useApi(`/lost-found/matches/${matchId}/messages`, { pollMs: 10000 });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const match = thread.data?.match;
  const messages = thread.data?.messages || [];

  if (thread.loading && !match) return <Screen><Loading /></Screen>;
  if (!match) return <Screen><ErrorNote error={thread.error} onRetry={thread.reload} /></Screen>;

  const send = async () => {
    const content = reply.trim();
    if (!content || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/lost-found/matches/${matchId}/messages`, { content });
      setReply('');
      await thread.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen source={thread}>
        {[match.lost, match.found].map((item, index) => (
          <Card key={item.id}>
            <Row>
              <TypeBadge type={index === 0 ? 'lost' : 'found'} />
              {item.isMine && <Badge>Yours</Badge>}
            </Row>
            <Title style={{ marginTop: 8, fontSize: 15 }}>{item.title}</Title>
            <Body style={{ fontSize: 13 }}>{item.description}</Body>
            <Muted>{item.location}</Muted>
          </Card>
        ))}
        <Muted style={{ marginBottom: 12 }}>
          Suggested automatically from the two descriptions ({Math.round(match.score * 100)}% similar). Confirm the details here with {match.otherPartyName} before meeting; no contact details are shared.
        </Muted>
        <ErrorNote error={error} />
        {messages.length === 0 ? <Muted style={{ textAlign: 'center', marginVertical: 12 }}>No messages yet. Ask something only the owner would know.</Muted> : null}
        <Bubbles messages={messages} meId={user.id} formatTime={formatDateTime} />
        <View style={{ marginTop: 16 }}>
          <Field placeholder="Type a message…" accessibilityLabel="Message" value={reply} onChangeText={setReply} maxLength={1000} multiline style={{ minHeight: 48 }} />
          <Btn title={busy ? 'Sending…' : 'Send'} disabled={busy || !reply.trim()} onPress={send} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
