import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ItemRow = ({ item, onPress }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                {item.category && <Text style={styles.category}>{item.category}</Text>}
            </View>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.quantity || item.qty || 1}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#ffffff',
        marginBottom: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2D2D2D',
    },
    category: {
        fontSize: 12,
        color: '#6B6B6B',
        marginTop: 2,
    },
    badge: {
        backgroundColor: '#EFE9E3',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        color: '#6B6B6B',
        fontWeight: 'bold',
    },
});

export default ItemRow;
