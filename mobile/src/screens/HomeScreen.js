import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>CouncilConnect mobile app is ready for feature work.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef4ff'
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#4d5b75'
  }
});
