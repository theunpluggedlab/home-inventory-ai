import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import SearchScreen from './src/screens/SearchScreen';
import ReviewScreen from './src/screens/ReviewScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    borderTopWidth: 0,
                    elevation: 0,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    height: 60,
                    paddingBottom: 10,
                },
                tabBarActiveTintColor: '#bba285',
                tabBarInactiveTintColor: '#999999',
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color }) => <MaterialIcons name="dashboard" size={24} color={color} />
                }}
            />
            <Tab.Screen
                name="Inventory"
                component={InventoryScreen}
                options={{
                    tabBarIcon: ({ color }) => <MaterialIcons name="inventory-2" size={24} color={color} />
                }}
            />
            <Tab.Screen
                name="Search"
                component={SearchScreen}
                options={{
                    tabBarIcon: ({ color }) => <MaterialIcons name="search" size={28} color={color} />
                }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    return (
        <NavigationContainer>
            <StatusBar style="dark" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen
                    name="ReviewItem"
                    component={ReviewScreen}
                    options={{ presentation: 'modal' }} // Full screen modal feel
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
