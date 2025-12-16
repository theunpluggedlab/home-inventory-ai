import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import ItemRow from '../components/ItemRow';

const SearchScreen = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const performSearch = async (text) => {
        setQuery(text);
        if (text.length === 0) {
            setResults([]);
            return;
        }

        // We could do client side filtering if data is small, or server side ILIKE
        // Let's do server side for scalability
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
                    <ItemRow item={item} onPress={() => { }} />
                    // We could add location subtext to ItemRow later
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
    },
    center: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
    }
});

export default SearchScreen;
