import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useAuth } from '../auth';
import { api, assetUrl } from '../api';
import { formatDateTime, GRIEVANCE_CATEGORY, STATUS_TONE, timeAgo, titleCase } from '../format';
import { Badge, Body, Btn, Card, ChipSelect, Empty, ErrorNote, Field, Loading, Muted, Row, Screen, Title, colors, useApi } from '../ui';

/** Category and priority from AI triage; both are empty for a moment after submission. */
function Triage({ grievance }) {
  if (!grievance.category) return <Badge tone="gray">Categorising…</Badge>;
  return (
    <>
      <Badge>{GRIEVANCE_CATEGORY[grievance.category]}</Badge>
      <Badge tone={STATUS_TONE[grievance.priority]}>{titleCase(grievance.priority)} priority</Badge>
    </>
  );
}

export function GrievancesScreen({ navigation }) {
  const { user } = useAuth();
  const list = useApi('/grievances', { pollMs: 30000 });
  const [tab, setTab] = useState('open');
  const all = list.data?.grievances || [];
  const isHandler = Boolean(list.data?.isHandler);
  const groups = {
    open: all.filter((g) => g.status !== 'resolved' && !g.escalatedAt),
    escalated: all.filter((g) => g.status !== 'resolved' && g.escalatedAt),
    resolved: all.filter((g) => g.status === 'resolved'),
  };

  return (
    <Screen source={list}>
      {user.role === 'student' && <Btn title="Submit a complaint" onPress={() => navigation.navigate('GrievanceNew')} style={{ marginBottom: 14 }} />}
      <ChipSelect
        value={tab}
        onChange={setTab}
        options={[['open', 'Open'], ['escalated', 'Escalated'], ['resolved', 'Resolved']].map(([value, label]) => ({ value, label: `${label} (${groups[value].length})` }))}
      />
      <ErrorNote error={list.error} onRetry={list.reload} />
      {list.loading && !list.data ? (
        <Loading />
      ) : groups[tab].length === 0 && !list.error ? (
        <Empty title={tab === 'open' ? 'No open complaints' : tab === 'escalated' ? 'Nothing escalated' : 'No resolved complaints yet'} />
      ) : (
        groups[tab].map((g) => (
          <Card key={g.id} onPress={() => navigation.navigate('GrievanceDetail', { grievanceId: g.id })} label={`${g.title}, ${g.status}`}>
            <Row><Triage grievance={g} /></Row>
            <Title style={{ marginTop: 10 }}>{g.title}</Title>
            <Muted numberOfLines={2}>{g.description}</Muted>
            <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <Muted>{[g.roomNumber, isHandler ? g.raisedBy.fullName : null, timeAgo(g.createdAt)].filter(Boolean).join(' · ')}</Muted>
              <Badge tone={STATUS_TONE[g.status]}>{titleCase(g.status)}</Badge>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}

export function GrievanceNewScreen({ navigation }) {
  const [form, setForm] = useState({ title: '', roomNumber: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { grievance } = await api.post('/grievances', { title: form.title.trim(), description: form.description.trim(), roomNumber: form.roomNumber.trim() });
      navigation.replace('GrievanceDetail', { grievanceId: grievance.id });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen>
        <Muted style={{ marginBottom: 14 }}>Describe the problem. It is categorised and prioritised automatically, and you can track every step.</Muted>
        <ErrorNote error={error} />
        <Field label="Title" value={form.title} onChangeText={set('title')} maxLength={120} placeholder="e.g. Water leakage in room 214" />
        <Field label="Room / location (optional)" value={form.roomNumber} onChangeText={set('roomNumber')} maxLength={40} placeholder="e.g. Hostel C-214" />
        <Field label="Description" hint={`${form.description.length}/1000`} value={form.description} onChangeText={set('description')} maxLength={1000} multiline placeholder="What is wrong, since when, and how many people it affects." />
        <Btn title={busy ? 'Submitting…' : 'Submit complaint'} disabled={busy || !form.title.trim() || !form.description.trim()} onPress={submit} />
        <Muted style={{ marginTop: 12 }}>To attach a photo, submit from the web app.</Muted>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const HISTORY_TITLE = { submitted: 'Submitted', assigned: 'Assigned', in_progress: 'Work in progress', resolved: 'Resolved', escalated: 'Escalated to the HOD' };
// Actions that need text: [label for the field, button title, text required]
const DIALOGS = {
  start: ['Note for the student (optional)', 'Mark in progress', false],
  resolve: ['What was done', 'Mark resolved', true],
  escalate: ['Why are you escalating?', 'Escalate to the HOD', true],
};

export function GrievanceDetailScreen({ route }) {
  const detail = useApi(`/grievances/${route.params.grievanceId}`, { pollMs: 15000 });
  const [dialog, setDialog] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (detail.loading && !detail.data) return <Screen><Loading /></Screen>;
  if (!detail.data) return <Screen><ErrorNote error={detail.error} onRetry={detail.reload} /></Screen>;

  const { grievance: g, history, actions } = detail.data;

  const run = async (action, body = {}) => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/grievances/${g.id}/${action}`, body);
      setDialog(null);
      setText('');
      await detail.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const open = (name) => {
    setError(null);
    setText('');
    setDialog(name);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen source={detail}>
        <Card>
          <Row>
            <Triage grievance={g} />
            <Badge tone={STATUS_TONE[g.status]}>{titleCase(g.status)}</Badge>
          </Row>
          <Title style={{ fontSize: 20, marginTop: 10 }}>{g.title}</Title>
          <Body style={{ marginTop: 8 }}>{g.description}</Body>
          {g.imageUrl ? <Image source={{ uri: assetUrl(g.imageUrl) }} style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 12 }} accessibilityLabel="Photo evidence" /> : null}
          <View style={{ marginTop: 12, gap: 2 }}>
            {g.roomNumber ? <Muted>Room: {g.roomNumber}</Muted> : null}
            <Muted>Raised by {g.raisedBy.fullName}{g.raisedBy.unitCode ? ` (${g.raisedBy.unitCode})` : ''}</Muted>
            <Muted>{g.assignedTo ? `Assigned to ${g.assignedTo.fullName}` : 'Not assigned yet'}</Muted>
            <Muted>Submitted {formatDateTime(g.createdAt)}</Muted>
            {g.escalationDueAt ? <Muted>Escalates automatically if unresolved by {formatDateTime(g.escalationDueAt)}</Muted> : null}
          </View>
          {g.resolutionNote ? (
            <View style={{ marginTop: 12, backgroundColor: '#e6f6ec', borderRadius: 12, padding: 12 }}>
              <Body><Body style={{ fontWeight: '700' }}>Resolution: </Body>{g.resolutionNote}</Body>
            </View>
          ) : null}
        </Card>

        {!dialog && <ErrorNote error={error} />}

        {!dialog && (actions.take || actions.start || actions.resolve || actions.escalate) && (
          <Card>
            <Row>
              {actions.take && <Btn title="Take this complaint" disabled={busy} onPress={() => run('take')} />}
              {actions.start && <Btn title="Start work" variant="outline" disabled={busy} onPress={() => open('start')} />}
              {actions.resolve && <Btn title="Resolve" disabled={busy} onPress={() => open('resolve')} />}
              {actions.escalate && <Btn title="Escalate to HOD" variant="danger" disabled={busy} onPress={() => open('escalate')} />}
            </Row>
            {actions.escalate && <Muted style={{ marginTop: 10 }}>Not getting a response? You can escalate now instead of waiting for the automatic deadline.</Muted>}
          </Card>
        )}

        {dialog && (
          <Card>
            <ErrorNote error={error} />
            <Field label={DIALOGS[dialog][0]} hint={`${text.length}/1000`} value={text} onChangeText={setText} maxLength={1000} multiline />
            <Row>
              <Btn
                title={busy ? 'Saving…' : DIALOGS[dialog][1]}
                variant={dialog === 'escalate' ? 'danger' : 'primary'}
                disabled={busy || (DIALOGS[dialog][2] && !text.trim())}
                onPress={() => run(dialog, dialog === 'escalate' ? { reason: text.trim() } : { note: text.trim() })}
              />
              <Btn title="Cancel" variant="ghost" onPress={() => setDialog(null)} />
            </Row>
          </Card>
        )}

        <Card>
          <Title style={{ marginBottom: 6 }}>Timeline</Title>
          {history.map((entry) => (
            <View key={entry.id} style={{ borderLeftWidth: 3, borderLeftColor: colors.blue, paddingLeft: 12, marginTop: 12 }}>
              <Body style={{ fontWeight: '700' }}>{HISTORY_TITLE[entry.status]}</Body>
              <Muted>{entry.actorName} · {formatDateTime(entry.createdAt)}</Muted>
              {entry.note ? <Body style={{ fontSize: 13 }}>{entry.note}</Body> : null}
            </View>
          ))}
          {g.status !== 'resolved' && (
            <View style={{ borderLeftWidth: 3, borderLeftColor: colors.border, paddingLeft: 12, marginTop: 12 }}>
              <Muted>Resolution pending</Muted>
            </View>
          )}
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
