import React, { useState } from 'react';
import { Badge, Table, Button, useToast, EmptyState, Field, ErrorNote, Loading } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { formatDate, formatTerm } from '../lib/format.js';

const STATUS_TONE = { unused: 'blue', used: 'green', expired: 'gray' };

/**
 * Issue and revoke invite codes. Admins can issue for any council seat or for another admin;
 * a General Secretary only for seats in their own council. The server enforces both.
 */
export default function InviteCodes() {
  const toast = useToast();
  const options = useApi('/invite-codes/options');
  const list = useApi('/invite-codes');
  const [form, setForm] = useState({ kind: 'representative', councilId: '', position: '', expiresInDays: '30' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fresh, setFresh] = useState(null); // the code just issued, shown prominently so it can be copied

  const councils = options.data?.councils || [];
  const council = councils.find((c) => c.id === form.councilId) || (councils.length === 1 ? councils[0] : null);
  const codes = list.data?.codes || [];
  const isAdminCode = form.kind === 'admin';

  const issue = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = isAdminCode
        ? { role: 'admin', expiresInDays: Number(form.expiresInDays) }
        : { role: 'representative', councilId: council.id, position: form.position, expiresInDays: Number(form.expiresInDays) };
      const { code } = await api.post('/invite-codes', body);
      setFresh(code);
      setForm((f) => ({ ...f, position: '' }));
      await list.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (code) => {
    setError(null);
    try {
      await api.del(`/invite-codes/${encodeURIComponent(code.code)}`);
      toast('Invite code revoked', 'success');
      if (fresh?.code === code.code) setFresh(null);
      await list.reload();
    } catch (err) {
      setError(err);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied', 'success');
    } catch {
      toast('Could not copy. Select the code and copy it by hand', 'error');
    }
  };

  if (options.loading && !options.data) return <Loading />;
  if (!options.data) return <ErrorNote error={options.error} onRetry={options.reload} />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
      <div className="card-accent">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>Issue an invite <em className="blue">code</em></h3>
        <p className="muted" style={{ fontSize: '0.8rem', margin: '6px 0 14px' }}>
          A code creates one account for one position. The account starts unverified and still has to be verified.
        </p>
        <form onSubmit={issue}>
          <ErrorNote error={error} />
          {options.data.canIssueAdmin && (
            <Field label="Code for">
              <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="representative">A council member</option>
                <option value="admin">An administrator (HOD level)</option>
              </select>
            </Field>
          )}
          {!isAdminCode && (
            <>
              {councils.length > 1 && (
                <Field label="Council">
                  <select className="select" value={form.councilId} onChange={(e) => setForm({ ...form, councilId: e.target.value, position: '' })} required>
                    <option value="">Select council</option>
                    {councils.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label={council && councils.length === 1 ? `Position in the ${council.name}` : 'Position'}>
                <select className="select" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required disabled={!council}>
                  <option value="">{council ? 'Select position' : 'Choose a council first'}</option>
                  {(council?.positions || []).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="Valid for (days)" hint="After this the code stops working if it has not been used.">
            <input type="number" className="input" min={1} max={365} step={1} value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} required />
          </Field>
          <Button type="submit" disabled={busy || (!isAdminCode && (!council || !form.position))}>
            <i className="fas fa-ticket" /> {busy ? 'Issuing…' : 'Issue code'}
          </Button>
        </form>

        {fresh && (
          <div role="status" style={{ marginTop: 16, background: 'var(--blue-soft, #f2f6ff)', border: '1.5px dashed rgba(34,102,237,.4)', borderRadius: 14, padding: '12px 14px' }}>
            <div className="muted" style={{ fontSize: '0.76rem' }}>
              New code for {fresh.role === 'admin' ? 'an administrator' : `${fresh.positionTitle}, ${fresh.councilName}`}
            </div>
            <div className="row" style={{ gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <code style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: 1, userSelect: 'all' }}>{fresh.code}</code>
              <Button size="sm" variant="out" onClick={() => copy(fresh.code)}><i className="fas fa-copy" /> Copy</Button>
            </div>
            <p className="faint" style={{ fontSize: '11px', marginTop: 8 }}>
              Give it to that person only. They enter it on the register page with their college email.
            </p>
          </div>
        )}
      </div>

      <div className="card-accent">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: 12 }}>Issued <em className="blue">codes</em></h3>
        <ErrorNote error={list.error} onRetry={list.reload} />
        {list.loading && !list.data ? (
          <Loading />
        ) : codes.length === 0 ? (
          <EmptyState icon="ticket" title="No invite codes yet" />
        ) : (
          <Table head={['Code', 'For', 'Status', 'Expires', '']}>
            {codes.map((c) => (
              <tr key={c.code}>
                <td><code style={{ userSelect: 'all', fontWeight: 700 }}>{c.code}</code></td>
                <td>
                  {c.role === 'admin' ? 'Administrator' : c.positionTitle}
                  {c.councilName && <div className="faint" style={{ fontSize: '0.72rem' }}>{c.councilName} · {formatTerm(c.termStart, c.termEnd)}</div>}
                </td>
                <td>
                  <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  {c.usedByName && <div className="faint" style={{ fontSize: '0.72rem', marginTop: 3 }}>by {c.usedByName}</div>}
                </td>
                <td className="faint" style={{ whiteSpace: 'nowrap' }}>{c.expiresAt ? formatDate(c.expiresAt) : 'Never'}</td>
                <td>
                  {c.status !== 'used' && (
                    <Button size="sm" variant="ghost" onClick={() => revoke(c)} aria-label={`Revoke code ${c.code}`}>Revoke</Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
