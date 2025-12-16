import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import RoomSection from '../components/RoomSection';

const InventoryScreen = ({ navigation }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchInventory = async () => {
        try {
            // Supabase Query
            const { data: rawData, error } = await supabase
                .from('rooms')
                .select(`
            id,
            name,
            storage:storage_units (
                id,
                name,
                items (
                    id,
                    name,
                    quantity,
                    category,
                    image_url
                )
            )
        `);

            if (error) throw error;

            console.log('Fetched inventory items:', rawData?.length);
            setData(rawData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchInventory();
    }, []);

    const handleItemPress = (item) => {
        // Navigate to Details? For now just log or alert
        // navigation.navigate('ItemDetails', { item });
        console.log("Pressed item", item.name);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Inventory</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#C9B59C" />
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                        <RoomSection
                            room={item}
                            storageUnits={item.storage}
                            onItemPress={handleItemPress}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9B59C" />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No inventory found.</Text>
                        </View>
                    }
                />
            )}
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
        borderBottomWidth: 1,
        borderBottomColor: '#EFE9E3',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    listContent: {
        padding: 24,
        paddingBottom: 100,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    }
});

export default InventoryScreen;
