import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Animated,
  PanResponder,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons, Feather, FontAwesome, AntDesign } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';

const { width } = Dimensions.get('window');

const TaskItem = ({ 
  task, 
  onDelete, 
  onToggle, 
  onEdit, 
  onPriorityChange, 
  onDueDateChange,
  index,
  colors,
  reorderTasks,
  totalTasks
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(task.text);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(task.dueDate ? new Date(task.dueDate) : new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Animations
  const entryAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(task.completed ? 1 : 0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dragAnim = useRef(new Animated.Value(0)).current;
  const actionAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;
  
  // Toggle actions menu
  const toggleActions = () => {
    Animated.spring(actionAnim, {
      toValue: showActions ? 0 : 1,
      useNativeDriver: true,
    }).start();
    setShowActions(!showActions);
  };

  // Toggle delete confirmation
  const toggleDeleteConfirm = () => {
    Animated.spring(deleteAnim, {
      toValue: showDeleteConfirm ? 0 : 1,
      useNativeDriver: true,
    }).start();
    setShowDeleteConfirm(!showDeleteConfirm);
  };

  // Confirm delete
  const confirmDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: toggleDeleteConfirm
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            onDelete();
          }
        }
      ]
    );
  };

  // Glow effect for important tasks
  useEffect(() => {
    if (task.priority === 'high') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [task.priority]);

  // Pan responder for drag and drop
  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isEditing && !showDeleteConfirm,
      onPanResponderGrant: () => {
        setIsDragging(true);
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          useNativeDriver: true
        }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      onPanResponderMove: (_, gestureState) => {
        dragAnim.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        const dropPosition = Math.round(gestureState.dy / 60);
        const newIndex = Math.min(Math.max(index + dropPosition, 0), totalTasks - 1);
        
        if (newIndex !== index) {
          reorderTasks(index, newIndex);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true
          }),
          Animated.spring(dragAnim, {
            toValue: 0,
            useNativeDriver: true
          })
        ]).start(() => setIsDragging(false));
      }
    })
  ).current;
  
  // Entry animation
  useEffect(() => {
    Animated.spring(entryAnim, {
      toValue: 1,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);
  
  // Check animation
  useEffect(() => {
    Animated.timing(checkAnim, {
      toValue: task.completed ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [task.completed]);
  
  // Handle date change
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      onDueDateChange(selectedDate);
    }
  };
  
  // Save edited text
  const saveEdit = () => {
    if (editedText.trim() && onEdit) {
      onEdit(editedText);
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  // Change priority
  const changePriority = () => {
    const newPriority = 
      task.priority === 'low' ? 'medium' : 
      task.priority === 'medium' ? 'high' : 'low';
    onPriorityChange(newPriority);
    Haptics.selectionAsync();
  };
  
  // Get priority color
  const getPriorityColor = () => {
    return task.priority === 'high' ? colors.highPriority : 
           task.priority === 'medium' ? colors.mediumPriority : 
           colors.lowPriority;
  };
  
  // Check if task is overdue
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  
  // Get time remaining text
  const getTimeRemaining = () => {
    if (!task.dueDate) return '';
    const now = new Date();
    const due = new Date(task.dueDate);
    const diff = due - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days < 7) return `Due in ${days} days`;
    if (days < 30) return `Due in ${Math.floor(days / 7)} weeks`;
    return `Due in ${Math.floor(days / 30)} months`;
  };

  // Render right actions for swipeable
  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    
    return (
      <Pressable 
        onPress={confirmDelete}
        style={styles.deleteContainer}
      >
        <Animated.View style={[
          styles.deleteButton,
          {
            transform: [{ scale }],
            backgroundColor: colors.danger
          }
        ]}>
          <Ionicons name="trash" size={20} color="white" />
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: entryAnim,
          transform: [
            {
              translateY: entryAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0]
              })
            },
            {
              translateY: dragAnim
            },
            {
              scale: scaleAnim
            }
          ],
          zIndex: isDragging ? 100 : 1,
          elevation: isDragging ? 10 : 2,
        }
      ]}
      {...dragResponder.panHandlers}
    >
      {/* Glow effect for high priority tasks */}
      {task.priority === 'high' && (
        <Animated.View style={[
          styles.glow,
          {
            backgroundColor: colors.highPriority,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.3]
            })
          }
        ]} />
      )}
      
      {/* Delete confirmation overlay */}
      <Animated.View style={[
        styles.deleteOverlay,
        {
          opacity: deleteAnim,
          transform: [{
            translateX: deleteAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [width, 0]
            })
          }]
        }
      ]}>
        <Text style={[styles.deleteOverlayText, { color: colors.text }]}>
          Delete this task?
        </Text>
        <View style={styles.deleteOverlayButtons}>
          <Pressable 
            onPress={toggleDeleteConfirm}
            style={({ pressed }) => [
              styles.deleteOverlayButton,
              { backgroundColor: colors.card },
              pressed && { opacity: 0.8 }
            ]}
          >
            <Text style={[styles.deleteOverlayButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </Pressable>
          <Pressable 
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              onDelete();
            }}
            style={({ pressed }) => [
              styles.deleteOverlayButton,
              { backgroundColor: colors.danger },
              pressed && { opacity: 0.8 }
            ]}
          >
            <Text style={[styles.deleteOverlayButtonText, { color: 'white' }]}>
              Delete
            </Text>
          </Pressable>
        </View>
      </Animated.View>
      
      {/* Swipeable container */}
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableOpen={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }}
        friction={2}
        rightThreshold={40}
        enabled={!isEditing && !showDeleteConfirm}
      >
        <View 
          style={[
            styles.task,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: task.completed ? 0.8 : 1,
              shadowColor: getPriorityColor(),
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: task.priority === 'high' ? 0.3 : 0,
              shadowRadius: 10,
            }
          ]}
        >
          {/* Priority indicator with gradient */}
          <LinearGradient
            colors={[
              getPriorityColor(),
              `${getPriorityColor()}80`,
              `${getPriorityColor()}00`
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.priorityIndicator}
          />
          
          {/* Checkbox with animation */}
          {!isEditing && (
            <Pressable 
              onPress={onToggle} 
              style={styles.checkboxContainer}
              onLongPress={toggleDeleteConfirm}
            >
              <Animated.View style={[
                styles.checkbox,
                {
                  borderColor: task.completed ? colors.primary : colors.subtext,
                  backgroundColor: task.completed ? colors.primary : 'transparent',
                  transform: [{
                    scale: checkAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1]
                    })
                  }]
                }
              ]}>
                <Animated.View style={{ opacity: checkAnim }}>
                  <Ionicons name="checkmark" size={16} color="white" />
                </Animated.View>
              </Animated.View>
            </Pressable>
          )}
          
          {/* Task content */}
          <View style={styles.content}>
            {isEditing ? (
              <TextInput
                style={[
                  styles.editInput,
                  {
                    color: colors.text,
                    borderBottomColor: colors.primary
                  }
                ]}
                value={editedText}
                onChangeText={setEditedText}
                autoFocus
                onSubmitEditing={saveEdit}
                onBlur={saveEdit}
                cursorColor={colors.primary}
                placeholder="Edit task..."
                placeholderTextColor={colors.subtext}
              />
            ) : (
              <>
                <View style={styles.textContainer}>
                  <Text style={[
                    styles.text,
                    {
                      color: task.completed ? colors.subtext : colors.text,
                      textDecorationLine: task.completed ? 'line-through' : 'none'
                    }
                  ]}>
                    {task.text}
                  </Text>
                  
                  {/* Task category/tag */}
                  {task.category && (
                    <View style={[
                      styles.category,
                      { backgroundColor: `${colors.primary}20` }
                    ]}>
                      <Text style={[
                        styles.categoryText,
                        { color: colors.primary }
                      ]}>
                        {task.category}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Due date and time remaining */}
                {task.dueDate && (
                  <View style={styles.dateContainer}>
                    <View style={[
                      styles.dueDate,
                      {
                        backgroundColor: isOverdue ? colors.warning + '20' : colors.primary + '20',
                        borderColor: isOverdue ? colors.warning : colors.primary
                      }
                    ]}>
                      <Feather 
                        name="calendar" 
                        size={12} 
                        color={isOverdue ? colors.warning : colors.primary} 
                        style={styles.dueDateIcon}
                      />
                      <Text style={[
                        styles.dueDateText,
                        {
                          color: isOverdue ? colors.warning : colors.primary
                        }
                      ]}>
                        {new Date(task.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    
                    <Text style={[
                      styles.timeRemaining,
                      {
                        color: isOverdue ? colors.warning : colors.subtext
                      }
                    ]}>
                      {getTimeRemaining()}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
          
          {/* Task actions */}
          {!isEditing && !showDeleteConfirm && (
            <View style={styles.actions}>
              {/* Quick actions menu */}
              <Animated.View style={[
                styles.actionMenu,
                {
                  transform: [{
                    translateX: actionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }],
                  opacity: actionAnim
                }
              ]}>
                <Pressable 
                  onPress={changePriority}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.pressed,
                    { backgroundColor: `${getPriorityColor()}20` }
                  ]}
                >
                  <Ionicons 
                    name={
                      task.priority === 'high' ? 'flag' : 
                      task.priority === 'medium' ? 'flag-outline' : 
                      'flag-sharp'
                    } 
                    size={18} 
                    color={getPriorityColor()} 
                  />
                </Pressable>
                
                <Pressable 
                  onPress={() => {
                    setIsEditing(true);
                    setShowActions(false);
                    Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.pressed,
                    { backgroundColor: `${colors.primary}20` }
                  ]}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </Pressable>
                
                <Pressable 
                  onPress={() => {
                    setShowDatePicker(true);
                    setShowActions(false);
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.pressed,
                    { backgroundColor: `${colors.primary}20` }
                  ]}
                >
                  <Feather 
                    name="calendar" 
                    size={18} 
                    color={task.dueDate ? colors.primary : colors.subtext} 
                  />
                </Pressable>
                
                <Pressable 
                  onPress={toggleDeleteConfirm}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.pressed,
                    { backgroundColor: `${colors.danger}20` }
                  ]}
                >
                  <Ionicons name="trash" size={18} color={colors.danger} />
                </Pressable>
              </Animated.View>
              
              {/* More options button */}
              <Pressable 
                onPress={toggleActions}
                style={({ pressed }) => [
                  styles.moreButton,
                  pressed && styles.pressed,
                  showActions && { backgroundColor: colors.primary }
                ]}
              >
                <Ionicons 
                  name="ellipsis-vertical" 
                  size={18} 
                  color={showActions ? 'white' : colors.subtext} 
                />
              </Pressable>
            </View>
          )}
        </View>
      </Swipeable>
      
      {/* Progress bar for subtasks (if applicable) */}
      {task.subtasks && task.subtasks.length > 0 && (
        <View style={styles.progressContainer}>
          <View style={[
            styles.progressBar,
            { backgroundColor: `${colors.primary}20` }
          ]}>
            <Animated.View style={[
              styles.progressFill,
              {
                width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length * 100)}%`,
                backgroundColor: colors.primary
              }
            ]} />
          </View>
          <Text style={[
            styles.progressText,
            { color: colors.subtext }
          ]}>
            {task.subtasks.filter(st => st.completed).length} of {task.subtasks.length} completed
          </Text>
        </View>
      )}
      
      {/* Date picker */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
          themeVariant={colors.theme === 'dark' ? 'dark' : 'light'}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  glow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 20,
  },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  priorityIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  checkboxContainer: {
    marginRight: 12,
    padding: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  category: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editInput: {
    fontSize: 16,
    borderBottomWidth: 2,
    paddingVertical: 4,
    marginRight: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  dueDateIcon: {
    marginRight: 4,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeRemaining: {
    fontSize: 12,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 12,
    alignItems: 'center',
  },
  actionMenu: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 4,
    position: 'absolute',
    right: 40,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteContainer: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 70,
    height: '80%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 10,
  },
  deleteOverlayText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  deleteOverlayButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  deleteOverlayButton: {
    padding: 15,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
  },
  deleteOverlayButtonText: {
    fontWeight: 'bold',
  },
});

export default TaskItem;