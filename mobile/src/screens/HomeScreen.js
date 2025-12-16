import { GoogleGenerativeAI } from "@google/generative-ai";

// ... existing imports

const HomeScreen = ({ navigation }) => {
    const [stats, setStats] = useState({ total: 0, recent: [] });

    // Temp Debug Function
    const checkModels = async () => {
        const API_KEY = "AIzaSyBlN79jHSkj5BImvulotPTZBdpo6oLS6aI"; // Temporarily here for test
        const genAI = new GoogleGenerativeAI(API_KEY);
        try {
            // Note: client side listModels might be restricted or require polyfill
            // usage depends on environment. If this fails, we know it's environment/key issue.
            // But 'listModels' is not directly on genAI instance in all SDK versions, usually on the manager.
            // The SDK doesn't always expose listModels in the browser bundle effectively.
            // Let's try getting a model and running a simple text prompt as a connectivity test.

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Hello");
            const response = await result.response;
            Alert.alert("Success", "Standard Flash Model Working: " + response.text());
        } catch (error) {
            Alert.alert("Model check failed", error.message);
            console.log("Model Check Error", error);
        }
    };

    // ... existing code ...

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Dashboard</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={checkModels} style={{ padding: 8, backgroundColor: '#eee', borderRadius: 8 }}>
                        <Text style={{ fontSize: 10 }}>DEBUG MODELS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                        <MaterialIcons name="settings" size={24} color="#2D2D2D" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ... rest of code ... */}

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
