import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>HabitQuest</Text>
      <Text style={styles.subtitle}>Level up your habits</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e94560',
  },
  subtitle: {
    fontSize: 16,
    color: '#eee',
    marginTop: 8,
  },
});
