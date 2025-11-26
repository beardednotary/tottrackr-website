import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export function SummaryScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Summary</Text>
        <View style={styles.stat}>
          <Text>Wet Diapers: 5</Text>
        </View>
        <View style={styles.stat}>
          <Text>Dirty Diapers: 3</Text>
        </View>
        <View style={styles.stat}>
          <Text>Total Feedings: 6</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  stat: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  }
});