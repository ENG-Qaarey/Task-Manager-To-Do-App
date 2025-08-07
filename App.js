import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, Animated, Keyboard, StatusBar, TouchableOpacity, Dimensions, Switch, Modal, PanResponder, TouchableWithoutFeedback } from 'react-native';
import { Ionicons, MaterialIcons, Feather, FontAwesome, AntDesign } from '@expo/vector-icons';
import TaskItem from './comp/TaskItem';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AlertModal from './AlertModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Color schemes - moved to top of file
const darkColors = {
  background: '#0f172a',
  card: '#1e293b',
  text: 'white',
  subtext: '#94a3b8',
  primary: '#6366f1',
  border: '#334155',
  highPriority: '#ef4444',
  mediumPriority: '#f59e0b',
  lowPriority: '#10b981',
  warning: '#f97316',
  danger: '#dc2626'
};

const lightColors = {
  background: '#f8fafc',
  card: 'white',
  text: '#0f172a',
  subtext: '#64748b',
  primary: '#6366f1',
  border: '#e2e8f0',
  highPriority: '#dc2626',
  mediumPriority: '#d97706',
  lowPriority: '#059669',
  warning: '#ea580c',
  danger: '#b91c1c'
};

const { width } = Dimensions.get('window');

function MainApp() {
  // State management
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [priority, setPriority] = useState('medium');
  const [showStats, setShowStats] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs and animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef();
  const searchInputRef = useRef();

  // Load data from AsyncStorage on initial render
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem('@tasks');
        const savedTheme = await AsyncStorage.getItem('@theme');
        
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          // Convert string dates back to Date objects
          const tasksWithDates = parsedTasks.map(task => ({
            ...task,
            createdAt: new Date(task.createdAt),
            dueDate: task.dueDate ? new Date(task.dueDate) : null
          }));
          setTasks(tasksWithDates);
        }
        
        if (savedTheme) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save tasks to AsyncStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      const saveTasks = async () => {
        try {
          await AsyncStorage.setItem('@tasks', JSON.stringify(tasks));
        } catch (error) {
          console.error('Error saving tasks:', error);
        }
      };
      
      saveTasks();
    }
  }, [tasks, isLoading]);

  // Save theme preference to AsyncStorage when it changes
  useEffect(() => {
    if (!isLoading) {
      const saveTheme = async () => {
        try {
          await AsyncStorage.setItem('@theme', isDarkMode ? 'dark' : 'light');
        } catch (error) {
          console.error('Error saving theme:', error);
        }
      };
      
      saveTheme();
    }
  }, [isDarkMode, isLoading]);

  // Filter tasks based on active filter and search query
  const filteredTasks = tasks.filter(task => {
    // Filter by status
    if (activeFilter === 'active') return !task.completed;
    if (activeFilter === 'completed') return task.completed;
    
    // Filter by search query
    if (searchQuery) {
      return task.text.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    return true;
  });

  // Task statistics
  const activeTasksCount = tasks.filter(task => !task.completed).length;
  const completedTasksCount = tasks.filter(task => task.completed).length;
  const highPriorityCount = tasks.filter(task => task.priority === 'high' && !task.completed).length;
  const overdueCount = tasks.filter(task => 
    task.dueDate && new Date(task.dueDate) < new Date() && !task.completed
  ).length;

  // Color scheme
  const colors = isDarkMode ? darkColors : lightColors;

  // Add a new task
  const addTask = () => {
    if (newTask.trim()) {
      const newTaskObj = {
        id: Date.now(),
        text: newTask,
        completed: false,
        createdAt: new Date(),
        priority,
        dueDate: selectedDate > new Date() ? selectedDate : null
      };
      
      setTasks([newTaskObj, ...tasks]);
      setNewTask('');
      setPriority('medium');
      setSelectedDate(new Date());
      Keyboard.dismiss();
      
      // Animation sequence
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Toggle task completion
  const toggleTask = (taskId) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    
    setTasks(updatedTasks);
    
    // Check if all tasks are completed
    if (updatedTasks.every(task => task.completed)) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  // Edit task text
  const editTask = (taskId, newText) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, text: newText } : task
    ));
  };

  // Prepare to delete a task
  const prepareDelete = (taskId) => {
    setTaskToDelete(taskId);
    setModalVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // Confirm task deletion
  const confirmDelete = () => {
    setTasks(tasks.filter(task => task.id !== taskToDelete));
    setModalVisible(false);
    setTaskToDelete(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Clear all completed tasks
  const clearCompleted = () => {
    setTasks(tasks.filter(task => !task.completed));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    Haptics.selectionAsync();
  };

  // Handle date change for due date
  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  // Update task priority
  const updateTaskPriority = (taskId, newPriority) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, priority: newPriority } : task
    ));
  };

  // Update task due date
  const updateTaskDueDate = (taskId, newDate) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, dueDate: newDate } : task
    ));
  };

  // Toggle statistics modal
  const toggleStats = () => {
    Animated.timing(statsAnim, {
      toValue: showStats ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setShowStats(!showStats);
  };

  // Reorder tasks
  const reorderTasks = (fromIndex, toIndex) => {
    const newTasks = [...tasks];
    const [removed] = newTasks.splice(fromIndex, 1);
    newTasks.splice(toIndex, 0, removed);
    setTasks(newTasks);
  };

  // Clear all tasks
  const clearAllTasks = async () => {
    try {
      setTasks([]);
      await AsyncStorage.removeItem('@tasks');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error clearing all tasks:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Confetti celebration */}
      {showConfetti && (
        <ConfettiCannon 
          count={200} 
          origin={{ x: width / 2, y: 0 }} 
          fadeOut={true}
        />
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Task Manager</Text>
          <View style={styles.headerRight}>
            <Pressable onPress={toggleTheme} style={styles.themeToggle}>
              <Ionicons 
                name={isDarkMode ? "sunny" : "moon"} 
                size={24} 
                color={colors.primary} 
              />
            </Pressable>
            {tasks.length > 0 && (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Confirm Delete",
                    "Are you sure you want to clear all tasks?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Clear All", onPress: clearAllTasks, style: "destructive" }
                    ]
                  );
                }}
                style={styles.clearAllButton}
              >
                <Ionicons name="trash-outline" size={20} color={colors.warning} />
              </Pressable>
            )}
          </View>
        </View>
          
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {activeTasksCount > 0 
            ? `${activeTasksCount} task${activeTasksCount !== 1 ? 's' : ''} to go!` 
            : 'All caught up!'}
        </Text>
      </View>
        
      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.subtext} style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search tasks..."
          placeholderTextColor={colors.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
          cursorColor={colors.primary}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearch}>
            <Ionicons name="close" size={20} color={colors.subtext} />
          </Pressable>
        ) : null}
      </View>
      
      {/* Add task input */}
      <Animated.View style={[styles.inputContainer, {
        opacity: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.8]
        }),
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -5]
          })
        }],
        backgroundColor: colors.card,
        borderColor: colors.border
      }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="What needs to be done?"
          placeholderTextColor={colors.subtext}
          value={newTask}
          onChangeText={setNewTask}
          onSubmitEditing={addTask}
          returnKeyType="done"
          cursorColor={colors.primary}
        />
        
        {/* Priority selector */}
        <Pressable 
          onPress={() => setPriority(prev => 
            prev === 'low' ? 'medium' : prev === 'medium' ? 'high' : 'low'
          )}
          style={styles.priorityButton}
        >
          <Ionicons 
            name={priority === 'high' ? 'flag' : priority === 'medium' ? 'flag-outline' : 'flag-sharp'} 
            size={20} 
            color={
              priority === 'high' ? colors.highPriority : 
              priority === 'medium' ? colors.mediumPriority : 
              colors.lowPriority
            } 
          />
        </Pressable>
        
        {/* Due date picker */}
        <Pressable 
          onPress={() => setShowDatePicker(true)}
          style={styles.dateButton}
        >
          <Feather name="calendar" size={20} color={colors.primary} />
        </Pressable>
        
        <Pressable 
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
            { backgroundColor: colors.primary }
          ]}
          onPress={addTask}
        >
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
      </Animated.View>
      
      {/* Date picker modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
          themeVariant={isDarkMode ? 'dark' : 'light'}
        />
      )}
      
      {/* Filter tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
        <Pressable 
          style={[styles.filterButton, activeFilter === 'all' && styles.activeFilter, {
            backgroundColor: activeFilter === 'all' ? colors.primary : 'transparent'
          }]}
          onPress={() => {
            setActiveFilter('all');
            Haptics.selectionAsync();
          }}
        >
          <Text style={[styles.filterText, {
            color: activeFilter === 'all' ? 'white' : colors.text
          }]}>All</Text>
          <Text style={[styles.filterCount, {
            color: activeFilter === 'all' ? 'white' : colors.subtext
          }]}>{tasks.length}</Text>
        </Pressable>
        <Pressable 
          style={[styles.filterButton, activeFilter === 'active' && styles.activeFilter, {
            backgroundColor: activeFilter === 'active' ? colors.primary : 'transparent'
          }]}
          onPress={() => {
            setActiveFilter('active');
            Haptics.selectionAsync();
          }}
        >
          <Text style={[styles.filterText, {
            color: activeFilter === 'active' ? 'white' : colors.text
          }]}>Active</Text>
          <Text style={[styles.filterCount, {
            color: activeFilter === 'active' ? 'white' : colors.subtext
          }]}>{activeTasksCount}</Text>
        </Pressable>
        <Pressable 
          style={[styles.filterButton, activeFilter === 'completed' && styles.activeFilter, {
            backgroundColor: activeFilter === 'completed' ? colors.primary : 'transparent'
          }]}
          onPress={() => {
            setActiveFilter('completed');
            Haptics.selectionAsync();
          }}
        >
          <Text style={[styles.filterText, {
            color: activeFilter === 'completed' ? 'white' : colors.text
          }]}>Completed</Text>
          <Text style={[styles.filterCount, {
            color: activeFilter === 'completed' ? 'white' : colors.subtext
          }]}>{completedTasksCount}</Text>
        </Pressable>
      </View>
      
      {/* Statistics button */}
      <Pressable 
        onPress={toggleStats}
        style={[styles.statsButton, { backgroundColor: colors.card }]}
      >
        <Ionicons name="stats-chart" size={20} color={colors.primary} />
        <Text style={[styles.statsButtonText, { color: colors.text }]}>View Stats</Text>
      </Pressable>
      
      {/* Tasks list */}
      {filteredTasks.length > 0 ? (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.tasksContainer}
          contentContainerStyle={styles.tasksContent}
        >
          {filteredTasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => prepareDelete(task.id)}
              onEdit={(newText) => editTask(task.id, newText)}
              onPriorityChange={(newPriority) => updateTaskPriority(task.id, newPriority)}
              onDueDateChange={(newDate) => updateTaskDueDate(task.id, newDate)}
              index={index}
              colors={colors}
              reorderTasks={reorderTasks}
              totalTasks={filteredTasks.length}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons 
            name={searchQuery ? "search-off" : "check-circle-outline"} 
            size={60} 
            color={colors.primary} 
          />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {searchQuery 
              ? "No tasks match your search" 
              : activeFilter === 'all' 
                ? "No tasks yet" 
                : activeFilter === 'active' 
                  ? "All tasks completed!" 
                  : "No tasks completed yet"}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
            {searchQuery 
              ? "Try a different search term" 
              : activeFilter === 'all' 
                ? "Add your first task above!" 
                : activeFilter === 'active' 
                  ? "Enjoy your free time!" 
                  : "Get to work!"}
          </Text>
        </View>
      )}
      
      {/* Clear completed button */}
      {completedTasksCount > 0 && (
        <Pressable 
          style={[styles.clearButton, { borderTopColor: colors.border }]}
          onPress={clearCompleted}
        >
          <Text style={[styles.clearButtonText, { color: colors.subtext }]}>
            Clear completed ({completedTasksCount})
          </Text>
        </Pressable>
      )}
      
      {/* Statistics modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showStats}
        onRequestClose={toggleStats}
      >
        <TouchableWithoutFeedback onPress={toggleStats}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <Animated.View style={[styles.statsModal, { 
          backgroundColor: colors.card,
          transform: [{
            translateY: statsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [300, 0]
            })
          }]
        }]}>
          <View style={styles.statsHeader}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>Task Statistics</Text>
            <Pressable onPress={toggleStats} style={styles.closeStats}>
              <Ionicons name="close" size={24} color={colors.subtext} />
            </Pressable>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{tasks.length}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Total Tasks</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{activeTasksCount}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Active</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{completedTasksCount}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Completed</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.highPriority }]}>{highPriorityCount}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>High Priority</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{overdueCount}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Overdue</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Completion</Text>
            </View>
          </View>
        </Animated.View>
      </Modal>
      
      {/* Delete confirmation modal */}
      <AlertModal
        visible={modalVisible}
        type="confirm"
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setModalVisible(false)}
        colors={colors}
      />
    </View>
  );
}

// Wrap the main app with GestureHandlerRootView
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MainApp />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  themeToggle: {
    padding: 8,
    borderRadius: 12,
  },
  clearAllButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 50,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearSearch: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 16,
    padding: 4,
    paddingLeft: 16,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: 50,
  },
  priorityButton: {
    padding: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  dateButton: {
    padding: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderRadius: 12,
    padding: 6,
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeFilter: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontWeight: '500',
    fontSize: 14,
  },
  filterCount: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: 'center',
    elevation: 1,
  },
  statsButtonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  tasksContainer: {
    flex: 1,
    marginBottom: 20,
  },
  tasksContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  clearButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  clearButtonText: {
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  statsModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeStats: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
  },
});