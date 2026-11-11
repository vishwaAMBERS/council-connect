import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useAuth } from '../auth';
import { API_BASE } from '../api';
import { Btn, ChipSelect, ErrorNote, Field, Muted, Screen, colors, useApi } from '../ui';

const Heading = ({ title, sub }) => (
  <View style={{ alignItems: 'center', marginVertical: 24 }}>
    <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
      <Text style={{ color: colors.white, fontWeight: '900', fontSize: 22 }}>CC</Text>
    </View>
    <Text style={{ fontSize: 26, fontWeight: '800', color: colors.charcoal }}>{title}</Text>
    <Muted style={{ marginTop: 4 }}>{sub}</Muted>
  </View>
);

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password); // the navigator switches to the app once a user is set
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Heading title="CouncilConnect" sub="Sign in with your college email" />
        <ErrorNote error={error} />
        <Field label="College email" value={email} onChangeText={setEmail} placeholder="rollno@geca.ac.in" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" onSubmitEditing={submit} />
        <Btn title={busy ? 'Signing in…' : 'Sign In'} onPress={submit} disabled={busy || !email.trim() || !password} />
        <Btn title="Create an account" variant="ghost" onPress={() => navigation.navigate('Register')} style={{ marginTop: 10 }} />
        {__DEV__ ? <Muted style={{ textAlign: 'center', marginTop: 18 }}>Server: {API_BASE}</Muted> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function RegisterScreen() {
  const { register } = useAuth();
  const meta = useApi('/meta');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', unitCode: '', year: 1, inviteCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const hasInvite = form.inviteCode.trim().length > 0;
  const ready = form.fullName.trim().length >= 2 && form.email.trim() && form.password.length >= 8 && (form.unitCode || hasInvite);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        unitCode: form.unitCode || undefined,
        year: form.year,
        inviteCode: form.inviteCode.trim() || undefined,
      });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <ErrorNote error={error || meta.error} />
        <Field label="Full name" value={form.fullName} onChangeText={set('fullName')} maxLength={150} autoCapitalize="words" />
        <Field label="College email" value={form.email} onChangeText={set('email')} placeholder="rollno@geca.ac.in" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
        <Field label="Password" hint="At least 8 characters" value={form.password} onChangeText={set('password')} secureTextEntry textContentType="newPassword" />
        <ChipSelect label="Branch" value={form.unitCode} onChange={set('unitCode')} options={(meta.data?.units || []).map((u) => ({ value: u.code, label: u.code }))} />
        <ChipSelect label="Year of study" value={form.year} onChange={set('year')} options={[1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` }))} />
        <Field
          label="Invite code (council members and admins only)"
          hint="Students leave this empty. A code creates a council account for one position, which then needs verification."
          value={form.inviteCode}
          onChangeText={set('inviteCode')}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={40}
        />
        <Btn title={busy ? 'Creating…' : hasInvite ? 'Create Council Account' : 'Create Student Account'} onPress={submit} disabled={busy || !ready} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
