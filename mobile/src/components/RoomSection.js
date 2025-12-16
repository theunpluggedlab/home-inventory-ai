import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ItemRow from './ItemRow';

const RoomSection = ({ room, storageUnits, onItemPress }) => {
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.bar} />
                <Text style={styles.header}>{room.name}</Text>
            </View>

            {storageUnits.map((unit) => (
                <View key={unit.id} style={styles.storageBlock}>
                    <Text style={styles.storageTitle}>{unit.name}</Text>
                    {unit.items && unit.items.length > 0 ? (
                        unit.items.map(item => (
                            <ItemRow key={item.id} item={item} onPress={() => onItemPress(item)} />
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No items</Text>
                    )}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    bar: {
        width: 4,
        height: 18,
        backgroundColor: '#C9B59C',
        borderRadius: 4,
        marginRight: 10,
    },
    header: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2D2D2D',
    },
    storageBlock: {
        marginLeft: 14,
        paddingLeft: 14,
        borderLeftWidth: 2,
        borderLeftColor: '#D9CFC7',
        marginBottom: 12,
    },
    storageTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B6B6B',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 13,
        color: '#999',
        fontStyle: 'italic',
        paddingVertical: 6,
    }
});

export default RoomSection;
