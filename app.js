// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LogScreen } from './screens/LogScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#A7D7F9'
          },
          headerTintColor: '#2C3E50',
          tabBarActiveTintColor: '#8B6FD9'
        }}
      >
        <Tab.Screen 
          name="Log" 
          component={LogScreen}
          options={{
            title: 'TotTrackr'
          }}
        />
        <Tab.Screen name="Summary" component={SummaryScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}