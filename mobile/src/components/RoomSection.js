import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ItemRow from './ItemRow';

const RoomSection = ({ room, storageUnits, onItemPress, onDeleteRoom, onEditRoom, onDeleteStorageUnit, onEditStorageUnit }) => {
    return (
        <View style={styles.container}>
            {/* Room Header with Action Buttons */}
            <View style={styles.headerRow}>
                <View style={styles.bar} />
                <Text style={styles.header}>{room.name}</Text>
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onEditRoom(room)}
                    >
                        <MaterialIcons name="edit" size={18} color="#C9B59C" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onDeleteRoom(room)}
                    >
                        <MaterialIcons name="delete" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Storage Units */}
            {storageUnits.map((unit) => (
                <View key={unit.id} style={styles.storageBlock}>
                    {/* Storage Unit Header with Action Buttons */}
                    <View style={styles.storageTitleRow}>
                        <Text style={styles.storageTitle}>{unit.name}</Text>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => onEditStorageUnit(unit)}
                            >
                                <MaterialIcons name="edit" size={16} color="#C9B59C" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => onDeleteStorageUnit(unit)}
                            >
                                <MaterialIcons name="delete" size={16} color="#FF6B6B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Items */}
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
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
    },
    storageBlock: {
        marginLeft: 14,
        paddingLeft: 14,
        borderLeftWidth: 2,
        borderLeftColor: '#D9CFC7',
        marginBottom: 12,
    },
    storageTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    storageTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B6B6B',
        flex: 1,
    },
    emptyText: {
        fontSize: 13,
        color: '#999',
        fontStyle: 'italic',
        paddingVertical: 6,
    }
});

export default RoomSection;
