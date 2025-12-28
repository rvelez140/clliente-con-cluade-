import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import EmailDetailScreen from './src/screens/EmailDetailScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AIAssistantScreen from './src/screens/AIAssistantScreen';
import EncryptionScreen from './src/screens/EncryptionScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="EmailDetail" component={EmailDetailScreen} />
          <Stack.Screen name="Compose" component={ComposeScreen} />
          <Stack.Screen name="Accounts" component={AccountsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
          <Stack.Screen name="Encryption" component={EncryptionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App;
