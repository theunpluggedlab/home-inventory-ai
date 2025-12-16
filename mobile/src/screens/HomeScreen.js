import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

const HomeScreen = ({ navigation }) => {
    const [stats, setStats] = useState({ total: 0, recent: [] });

    const fetchStats = async () => {
        // Simple count query
        const { count, error } = await supabase.from('items').select('*', { count: 'exact', head: true });
        if (!error) {
            setStats(prev => ({ ...prev, total: count }));
        }

        // Recent items
        const { data } = await supabase.from('items').select('name, room:storage_units(room:rooms(name))').order('created_at', { ascending: false }).limit(3);
        if (data) setStats(prev => ({ ...prev, recent: data }));
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchStats();
        });
        return unsubscribe;
    }, [navigation]);

    const onScanPress = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "You need to allow camera access to scan items.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled) {
            // Navigate to Review Screen with the image uri
            navigation.navigate('ReviewItem', { imageUri: result.assets[0].uri });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Dashboard</Text>
                <TouchableOpacity style={styles.iconBtn}>
                    <MaterialIcons name="settings" size={24} color="#2D2D2D" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total Items</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.recent.length}</Text>
                        <Text style={styles.statLabel}>Recent Adds</Text>
                    </View>
                </View>

                {/* Scan Button */}
                <View style={styles.scanContainer}>
                    <TouchableOpacity style={styles.fab} onPress={onScanPress} activeOpacity={0.8}>
                        <MaterialIcons name="photo-camera" size={36} color="white" />
                        <Text style={styles.fabLabel}>SCAN ITEM</Text>
                    </TouchableOpacity>
                    <Text style={styles.hint}>Tap to capture Photo</Text>
                </View>

                {/* Recent List */}
                <View style={styles.recentSection}>
                    <Text style={styles.sectionTitle}>Recently Added</Text>
                    {stats.recent.map((item, idx) => (
                        <View key={idx} style={styles.recentItem}>
                            <View style={styles.recentIcon}>
                                <MaterialIcons name="chair" size={24} color="#bba285" />
                            </View>
                            <View>
                                <Text style={styles.miniName}>{item.name}</Text>
                                <Text style={styles.miniLoc}>
                                    {item.room?.room?.name || 'Unknown'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F8F6',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    content: {
        padding: 24,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 40,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        alignItems: 'flex-start',
    },
    statValue: {
        fontSize: 32,
        fontWeight: '600',
        color: '#2D2D2D',
    },
    statLabel: {
        fontSize: 14,
        color: '#6B6B6B',
        marginTop: 4,
    },
    scanContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    fab: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#C9B59C',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#C9B59C',
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 8,
    },
    fabLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'white',
        marginTop: 4,
    },
    hint: {
        marginTop: 16,
        color: '#999',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#2D2D2D',
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    recentIcon: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#EFE9E3',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    miniName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2D2D2D',
    },
    miniLoc: {
        fontSize: 13,
        color: '#6B6B6B',
    }
});

export default HomeScreen;
