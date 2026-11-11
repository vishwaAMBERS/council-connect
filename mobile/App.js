import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/auth';
import { Loading, colors } from './src/ui';
import { LoginScreen, RegisterScreen } from './src/screens/Auth';
import { HomeScreen, NotificationsScreen, CampusMapScreen } from './src/screens/Home';
import { DirectoryScreen, UserProfileScreen } from './src/screens/Directory';
import { InboxScreen, ThreadScreen } from './src/screens/Inbox';
import { EventsScreen, EventDetailScreen } from './src/screens/Events';
import { GrievancesScreen, GrievanceNewScreen, GrievanceDetailScreen } from './src/screens/Grievances';
import { LostFoundScreen, LostFoundNewScreen, MatchThreadScreen } from './src/screens/LostFound';

const Root = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const DirectoryStack = createNativeStackNavigator();
const EventsStack = createNativeStackNavigator();
const InboxStack = createNativeStackNavigator();

const header = { headerTintColor: colors.blue, headerTitleStyle: { color: colors.charcoal, fontWeight: '800' }, headerBackTitle: 'Back' };
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.blue } };

function DirectoryTab() {
  return (
    <DirectoryStack.Navigator screenOptions={header}>
      <DirectoryStack.Screen name="DirectoryList" component={DirectoryScreen} options={{ title: 'Council Directory' }} />
      <DirectoryStack.Screen name="UserProfile" component={UserProfileScreen} options={({ route }) => ({ title: route.params?.name || 'Profile' })} />
    </DirectoryStack.Navigator>
  );
}

function EventsTab() {
  return (
    <EventsStack.Navigator screenOptions={header}>
      <EventsStack.Screen name="EventsList" component={EventsScreen} options={{ title: 'Events' }} />
      <EventsStack.Screen name="EventDetail" component={EventDetailScreen} options={({ route }) => ({ title: route.params?.title || 'Event' })} />
    </EventsStack.Navigator>
  );
}

function InboxTab() {
  const { user } = useAuth();
  return (
    <InboxStack.Navigator screenOptions={header}>
      <InboxStack.Screen name="InboxList" component={InboxScreen} options={{ title: user.role === 'student' ? 'My Requests' : 'Contact Requests' }} />
      <InboxStack.Screen name="Thread" component={ThreadScreen} options={{ title: 'Request' }} />
    </InboxStack.Navigator>
  );
}

const TAB_ICONS = { Home: 'home', Directory: 'people', Events: 'calendar', Inbox: 'mail', Profile: 'person-circle' };

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        ...header,
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`} size={size} color={color} />,
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ headerShown: true, title: 'CouncilConnect', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="Directory" component={DirectoryTab} />
      <Tabs.Screen name="Events" component={EventsTab} />
      <Tabs.Screen name="Inbox" component={InboxTab} />
      <Tabs.Screen name="Profile" component={UserProfileScreen} options={{ headerShown: true, title: 'My Profile', tabBarLabel: 'Profile' }} />
    </Tabs.Navigator>
  );
}

function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <Loading label="Opening CouncilConnect…" />
      </View>
    );
  }

  // Signed-out users only ever see the login and register screens.
  return (
    <Root.Navigator screenOptions={header}>
      {!user ? (
        <>
          <Root.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Root.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
        </>
      ) : (
        <>
          <Root.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
          <Root.Screen name="Notifications" component={NotificationsScreen} />
          <Root.Screen name="Grievances" component={GrievancesScreen} options={{ title: 'Hostel Complaints' }} />
          <Root.Screen name="GrievanceNew" component={GrievanceNewScreen} options={{ title: 'Submit a Complaint' }} />
          <Root.Screen name="GrievanceDetail" component={GrievanceDetailScreen} options={{ title: 'Complaint' }} />
          <Root.Screen name="LostFound" component={LostFoundScreen} options={{ title: 'Lost & Found' }} />
          <Root.Screen name="LostFoundNew" component={LostFoundNewScreen} options={{ title: 'Report an Item' }} />
          <Root.Screen name="MatchThread" component={MatchThreadScreen} options={{ title: 'Possible Match' }} />
          <Root.Screen name="CampusMap" component={CampusMapScreen} options={{ title: 'Campus Map' }} />
        </>
      )}
    </Root.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="dark" />
          <Navigation />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
