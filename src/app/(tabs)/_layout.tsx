import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/core/theme';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        lazy: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textFaint,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTintColor: Colors.text,
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Início',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analises"
        options={{
          title: 'Análises',
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
          headerRight: () => (
            <Pressable onPress={() => router.push('/planos')} style={styles.headerRight}>
              <AppText variant="label" style={{ color: Colors.accent }}>PLANOS</AppText>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="horarios"
        options={{
          title: 'Horários',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="comunidade"
        options={{
          title: 'Comunidade',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bg,
    borderTopColor: Colors.surfaceElevated,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  header: { backgroundColor: Colors.bg },
  headerRight: { marginRight: 16 },
});
