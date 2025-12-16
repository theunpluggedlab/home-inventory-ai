import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import ItemRow from '../components/ItemRow';
import ItemDetailModal from '../components/ItemDetailModal';

const SearchScreen = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Move State
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const { data, error } = await supabase
                .from('storage_units')
                .select('id, name, rooms(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = data.map(unit => ({
                id: unit.id,
                name: unit.name,
                room: unit.rooms?.name || "Unknown Room",
                label: `${unit.rooms?.name || 'Unknown'} > ${unit.name}`
            }));
            setLocations(formatted);
        } catch (err) {
            console.log("Error fetching locations:", err);
        }
    };

    const performSearch = async (text) => {
        setQuery(text);
        if (text.length === 0) {
            setResults([]);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from('items')
            .select(`
            id, name, quantity, category, image_url,
            storage:storage_units(name, room:rooms(name))
        `)
            .ilike('name', `%${text}%`)
            .limit(20);

        setLoading(false);
        if (data) setResults(data);
        else if (error) console.error(error);
    };

    const handleItemPress = (item) => {
        setSelectedItem(item);
        setDetailModalVisible(true);
    };

    const handleUpdate = () => {
        // Refresh search results
        performSearch(query);
    };

    const handleMoveItem = () => {
        setDetailModalVisible(false); // Close detail modal first
        setSelectedLocation(null);
        setMoveModalVisible(true);
    };

    const handleMoveSubmit = async () => {
        if (!selectedLocation) {
            Alert.alert("Error", "Please select a location");
            return;
        }

        try {
            const { error } = await supabase
                .from('items')
                .update({ storage_id: selectedLocation.id })
                .eq('id', selectedItem.id);

            if (error) throw error;

            Alert.alert("Success", `Item moved to ${selectedLocation.label}`);
            setMoveModalVisible(false);
            performSearch(query); // Refresh list
        } catch (err) {
            Alert.alert("Error", "Failed to move item: " + err.message);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Search</Text>
            </View>

            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={24} color="#999" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Search items..."
                    placeholderTextColor="#999"
                    value={query}
                    onChangeText={performSearch}
                    autoFocus
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => performSearch('')}>
                        <MaterialIcons name="close" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={results}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleItemPress(item)}>
                        <ItemRow item={item} onPress={() => handleItemPress(item)} />
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    query.length > 0 && !loading ? (
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No results found.</Text>
                        </View>
                    ) : null
                }
            />

            {/* Item Detail Modal */}
            <ItemDetailModal
                visible={detailModalVisible}
                item={selectedItem}
                onClose={() => setDetailModalVisible(false)}
                onUpdate={handleUpdate}
                onMove={handleMoveItem}
            />

            {/* Move Item Modal */}
            <Modal visible={moveModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Move Item</Text>
                            <TouchableOpacity onPress={() => setMoveModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Moving: {selectedItem?.name}
                        </Text>

                        <Text style={styles.sectionLabel}>Select Location:</Text>

                        <ScrollView style={styles.locationList}>
                            {locations.map(loc => (
                                <TouchableOpacity
                                    key={loc.id}
                                    style={[
                                        styles.locationItem,
                                        selectedLocation?.id === loc.id && styles.locationItemSelected
                                    ]}
                                    onPress={() => setSelectedLocation(loc)}
                                >
                                    <View>
                                        <Text style={styles.locationName}>{loc.name}</Text>
                                        <Text style={styles.locationRoom}>{loc.room}</Text>
                                    </View>
                                    {selectedLocation?.id === loc.id && (
                                        <MaterialIcons name="check-circle" size={24} color="#C9B59C" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setMoveModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleMoveSubmit}
                            >
                                <Text style={styles.submitBtnTxt}>Move Here</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 24,
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: '100%',
    },
    list: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    center: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
    },

    // Modal Styles (Copied from InventoryScreen)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#999',
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 8,
    },
    locationList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    locationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    locationItemSelected: {
        borderColor: '#C9B59C',
        backgroundColor: '#FCF8F4',
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D2D2D',
    },
    locationRoom: {
        fontSize: 13,
        color: '#999',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFE9E3',
        alignItems: 'center',
    },
    cancelBtnTxt: {
        color: '#666',
        fontWeight: '600',
    },
    submitBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#C9B59C',
        alignItems: 'center',
    },
    submitBtnTxt: {
        color: 'white',
        fontWeight: '600',
    },
});

export default SearchScreen;
