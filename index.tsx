import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// FIX: The 'render' function from 'react-dom' is deprecated in React 18. Use 'createRoot' from 'react-dom/client' instead.
import { createRoot } from 'react-dom/client';

// PDF Export Libraries from index.html
declare const jspdf: any;

// --- TYPES ---
interface ShiftType {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Document {
  id:string;
  name: string;
  type: string;
  content: string; // Base64 content
}

interface ShiftCompletionHistory {
  status: 'completed' | 'incomplete';
  timestamp: string; // ISO string
}

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate: string; // YYYY-MM-DD
}

interface ShiftData {
  id: string;
  date: string; // YYYY-MM-DD
  typeId: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  documents?: Document[];
  reminderDateTime?: string; // ISO string
  priority?: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
  completionHistory?: ShiftCompletionHistory[];
  shiftChangeMemo?: string;
  recurrenceRule?: RecurrenceRule;
  recurrenceId?: string; 
  originalDate?: string; // YYYY-MM-DD, The start date of the series
}

interface ThemeColors {
    primaryColor: string;
    secondaryColor: string;
    dangerColor: string;
    textColor: string;
    bgColor: string;
    bgSecondaryColor: string;
    borderColor: string;
    headerBg: string;
    inputBg: string;
    inputBorder: string;
    modalBg: string;
}

interface CustomThemes {
    light: ThemeColors;
    dark: ThemeColors;
}

interface ListFiltersState {
    dateRange: { start: string, end: string };
    priorities: Array<'low' | 'medium' | 'high'>;
    status: 'all' | 'completed' | 'incomplete';
}
interface ListSortState {
    key: 'date' | 'priority';
    direction: 'asc' | 'desc';
}


// --- CONSTANTS & I18N ---
const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  { id: 'mattina', name: 'Mattina', color: '#4CAF50', icon: '☀️' },
  { id: 'pomeriggio', name: 'Pomeriggio', color: '#FFC107', icon: '🌇' },
  { id: 'notte', name: 'Notte', color: '#2196F3', icon: '🌙' },
  { id: 'riposo', name: 'Riposo', color: '#F44336', icon: '☕' },
  { id: 'ferie', name: 'Ferie', color: '#9C27B0', icon: '✈️' },
];

const AVAILABLE_ICONS = ['☀️', '🌇', '🌙', '☕', '✈️', '🏥', '🏠', '💻', '📞', '🛠️', '⚙️', '💡', '🔥', '💧', '🌍', '❤️'];

const DEFAULT_THEME_COLORS: CustomThemes = {
  light: {
    primaryColor: '#4a90e2',
    secondaryColor: '#f5a623',
    dangerColor: '#d0021b',
    textColor: '#333',
    bgColor: '#ffffff',
    bgSecondaryColor: '#f8f9fa',
    borderColor: '#dee2e6',
    headerBg: '#f8f9fa',
    inputBg: '#fff',
    inputBorder: '#ccc',
    modalBg: '#fff',
  },
  dark: {
    primaryColor: '#4a90e2',
    secondaryColor: '#f5a623',
    dangerColor: '#e03144',
    textColor: '#f8f9fa',
    bgColor: '#121212',
    bgSecondaryColor: '#1e1e1e',
    borderColor: '#444',
    headerBg: '#1e1e1e',
    inputBg: '#333',
    inputBorder: '#555',
    modalBg: '#2c2c2c',
  }
};

const translations = {
  it: {
    filterShifts: 'Filtra turni', help: 'Guida', settings: 'Impostazioni',
    mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Gio', fri: 'Ven', sat: 'Sab', sun: 'Dom',
    noShiftsFound: 'Nessun turno corrispondente ai filtri.',
    markAsIncomplete: 'Segna da completare', markAsComplete: 'Segna come completato',
    editShift: 'Modifica Turno', addShift: 'Aggiungi Turno', shiftType: 'Tipo di Turno',
    priority: 'Priorità', low: 'Bassa', medium: 'Media', high: 'Alta',
    startTime: 'Ora Inizio', endTime: 'Ora Fine', notes: 'Note',
    notesPlaceholder: 'Aggiungi dettagli...', addDocument: 'Aggiungi Documento (Max 2MB)',
    download: 'Scarica', delete: 'Elimina', setReminder: 'Imposta Promemoria',
    completed: 'Completato', save: 'Salva', cancel: 'Annulla',
    containsNotes: 'Contiene note', containsDocuments: 'Contiene documenti',
    reminderSetFor: 'Promemoria:',
    display: 'Visualizzazione', grid: 'Griglia', list: 'Lista',
    weekStart: 'Inizio settimana:', monday: 'Lunedì', sunday: 'Domenica',
    appearance: 'Aspetto', theme: 'Tema:', light: 'Chiaro', dark: 'Scuro',
    appFont: 'Carattere Applicazione:', customizeThemeColors: 'Personalizza Colori Tema',
    data: 'Dati', exportPDF: 'Esporta PDF', exportCSV: 'Esporta CSV',
    customization: 'Personalizzazione', customizeShiftTypes: 'Personalizza Tipi di Turno',
    close: 'Chiudi', language: 'Lingua', italian: 'Italiano', english: 'English',
    filterByDate: 'Filtra per Data', status: 'Stato', all: 'Tutti',
    incomplete: 'Da Fare', complete: 'Completati', sortBy: 'Ordina per', date: 'Data',
    filterShiftTypes: 'Filtra Tipi di Turno', selectAll: 'Seleziona tutti',
    deselectAll: 'Deseleziona tutti', customizeShiftTypesTitle: 'Personalizza Tipi di Turno',
    customIconPlaceholder: 'Icona pers.', customizeThemes: 'Personalizza Temi',
    themeLight: 'Tema Chiaro', themeDark: 'Tema Scuro', resetToDefaults: 'Ripristina Predefiniti',
    done: 'Fatto', primary: 'Primario', secondary: 'Secondario', danger: 'Pericolo',
    text: 'Testo', background: 'Sfondo', backgroundSecondary: 'Sfondo Secondario',
    border: 'Bordo', headerBackground: 'Sfondo Intestazione',
    inputBackground: 'Sfondo Input', inputBorder: 'Bordo Input', modalBackground: 'Sfondo Modale',
    helpTitle: 'Guida / Help',
    reminderTitle: 'Promemoria Turno',
    reminderBody: 'È ora per il tuo turno "{shiftName}" del {date} alle {time}.',
    completionHistory: 'Cronologia Completamento',
    completedOn: 'Completato il {date}',
    incompletedOn: 'Marcato da fare il {date}',
    fileTooLarge: 'Il file è troppo grande! Limite 2MB.',
    time: 'Orario',
    na: 'N/D',
    shiftChangeMemo: "Memo Cambio Turno",
    shiftChangeMemoPlaceholder: "Registra qui eventuali cambi di turno...",
    duplicateShiftConfirm: "Esiste già un turno identico in questa data. Salvare comunque?",
    containsShiftChangeMemo: "Contiene memo cambio turno",
    searchPlaceholder: 'Cerca tipo di turno...',
    filterAndSort: 'Filtra e Ordina',
    apply: 'Applica',
    reset: 'Resetta',
    startDate: 'Data Inizio',
    endDate: 'Data Fine',
    sortDirection: 'Direzione',
    ascending: 'Crescente',
    descending: 'Decrescente',
    setAsRecurring: 'Imposta come ricorrente',
    recurrence: 'Ricorrenza',
    repeats: 'Si ripete',
    every: 'Ogni',
    day_s: 'Giorno(i)',
    week_s: 'Settimana(e)',
    month_s: 'Mese(i)',
    daily: 'Giornaliero',
    weekly: 'Settimanale',
    monthly: 'Mensile',
    endDateRecurrence: 'Fine Ricorrenza',
    editRecurringShift: 'Modifica Turno Ricorrente',
    deleteRecurringShift: 'Elimina Turno Ricorrente',
    editRecurrenceQuestion: 'Cosa vuoi modificare?',
    deleteRecurrenceQuestion: 'Cosa vuoi eliminare?',
    thisInstanceOnly: 'Solo questa istanza',
    thisAndFutureInstances: 'Questa e le istanze future',
    allInstances: 'Tutte le istanze',
    containsRecurrence: 'Turno ricorrente',
  },
  en: {
    filterShifts: 'Filter shifts', help: 'Help', settings: 'Settings',
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
    noShiftsFound: 'No shifts match the filters.',
    markAsIncomplete: 'Mark as incomplete', markAsComplete: 'Mark as complete',
    editShift: 'Edit Shift', addShift: 'Add Shift', shiftType: 'Shift Type',
    priority: 'Priority', low: 'Low', medium: 'Medium', high: 'High',
    startTime: 'Start Time', endTime: 'End Time', notes: 'Notes',
    notesPlaceholder: 'Add details...', addDocument: 'Add Document (Max 2MB)',
    download: 'Download', delete: 'Delete', setReminder: 'Set Reminder',
    completed: 'Completed', save: 'Save', cancel: 'Cancel',
    containsNotes: 'Contains notes', containsDocuments: 'Contains documents',
    reminderSetFor: 'Reminder:',
    display: 'Display', grid: 'Grid', list: 'List', weekStart: 'Week starts on:',
    monday: 'Monday', sunday: 'Sunday', appearance: 'Appearance', theme: 'Theme:',
    light: 'Light', dark: 'Dark', appFont: 'Application Font:',
    customizeThemeColors: 'Customize Theme Colors', data: 'Data',
    exportPDF: 'Export PDF', exportCSV: 'Export CSV', customization: 'Customization',
    customizeShiftTypes: 'Customize Shift Types', close: 'Close', language: 'Language',
    italian: 'Italiano', english: 'English', filterByDate: 'Filter by Date',
    status: 'Status', all: 'All', incomplete: 'Incomplete', complete: 'Completed',
    sortBy: 'Sort by', date: 'Date', filterShiftTypes: 'Filter Shift Types',
    selectAll: 'Select all', deselectAll: 'Deselect all',
    customizeShiftTypesTitle: 'Customize Shift Types', customIconPlaceholder: 'Custom icon',
    customizeThemes: 'Customize Themes', themeLight: 'Light Theme', themeDark: 'Dark Theme',
    resetToDefaults: 'Reset to Defaults', done: 'Done', primary: 'Primary',
    secondary: 'Secondary', danger: 'Danger', text: 'Text', background: 'Background',
    backgroundSecondary: 'Secondary Background', border: 'Border',
    headerBackground: 'Header Background', inputBackground: 'Input Background',
    inputBorder: 'Input Border', modalBackground: 'Modal Background',
    helpTitle: 'Guida / Help',
    reminderTitle: 'Shift Reminder',
    reminderBody: 'It\'s time for your "{shiftName}" shift on {date} at {time}.',
    completionHistory: 'Completion History',
    completedOn: 'Completed on {date}',
    incompletedOn: 'Marked incomplete on {date}',
    fileTooLarge: 'File is too large! 2MB limit.',
    time: 'Time',
    na: 'N/A',
    shiftChangeMemo: "Shift Change Memo",
    shiftChangeMemoPlaceholder: "Log any shift changes here...",
    duplicateShiftConfirm: "An identical shift already exists on this date. Save anyway?",
    containsShiftChangeMemo: "Contains shift change memo",
    searchPlaceholder: 'Search shift type...',
    filterAndSort: 'Filter & Sort',
    apply: 'Apply',
    reset: 'Reset',
    startDate: 'Start Date',
    endDate: 'End Date',
    sortDirection: 'Direction',
    ascending: 'Ascending',
    descending: 'Descending',
    setAsRecurring: 'Set as recurring',
    recurrence: 'Recurrence',
    repeats: 'Repeats',
    every: 'Every',
    day_s: 'Day(s)',
    week_s: 'Week(s)',
    month_s: 'Month(s)',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    endDateRecurrence: 'Recurrence End Date',
    editRecurringShift: 'Edit Recurring Shift',
    deleteRecurringShift: 'Delete Recurring Shift',
    editRecurrenceQuestion: 'What do you want to edit?',
    deleteRecurrenceQuestion: 'What do you want to delete?',
    thisInstanceOnly: 'This instance only',
    thisAndFutureInstances: 'This and future instances',
    allInstances: 'All instances',
    containsRecurrence: 'Recurring shift',
  }
};
type TranslationKey = keyof typeof translations.it;


const App: React.FC = () => {
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftData[]>(() => {
    const saved = localStorage.getItem('shifts');
    return saved ? JSON.parse(saved) : [];
  });
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(() => {
    const saved = localStorage.getItem('shiftTypes');
    return saved ? JSON.parse(saved) : DEFAULT_SHIFT_TYPES;
  });
  
  // Settings State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('viewMode') as 'grid' | 'list') || 'grid');
  const [weekStartsOn, setWeekStartsOn] = useState<'monday' | 'sunday'>(() => (localStorage.getItem('weekStartsOn') as 'monday' | 'sunday') || 'monday');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem('fontFamily') || 'Roboto');
  const [language, setLanguage] = useState<'it' | 'en'>(() => (localStorage.getItem('language') as 'it' | 'en') || 'it');
  const [customThemes, setCustomThemes] = useState<CustomThemes>(() => {
    const saved = localStorage.getItem('customThemes');
    return saved ? JSON.parse(saved) : DEFAULT_THEME_COLORS;
  });
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState<string[]>(() => {
    const saved = localStorage.getItem('activeFilters');
    if (saved) {
      return JSON.parse(saved);
    }
    const savedTypes = localStorage.getItem('shiftTypes');
    const initialTypes = savedTypes ? JSON.parse(savedTypes) : DEFAULT_SHIFT_TYPES;
    return initialTypes.map((t: ShiftType) => t.id);
  });
  const [isFilterPopoverOpen, setFilterPopoverOpen] = useState(false);


  // Modal State
  const [isShiftModalOpen, setShiftModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isCustomizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [isThemeModalOpen, setThemeModalOpen] = useState(false);
  const [isHelpModalOpen, setHelpModalOpen] = useState(false);
  const [isListFilterModalOpen, setListFilterModalOpen] = useState(false);
  const [isRecurrenceModalOpen, setRecurrenceModalOpen] = useState(false);
  const [recurrenceAction, setRecurrenceAction] = useState<{ action: 'edit' | 'delete', shift: ShiftData } | null>(null);

  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingShift, setEditingShift] = useState<ShiftData | null>(null);

  // Shift Modal Inputs
  const [modalShiftType, setModalShiftType] = useState<string>('');
  const [modalStartTime, setModalStartTime] = useState('');
  const [modalEndTime, setModalEndTime] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalDocuments, setModalDocuments] = useState<Document[]>([]);
  const [modalReminderEnabled, setModalReminderEnabled] = useState(false);
  const [modalReminderDateTime, setModalReminderDateTime] = useState('');
  const [modalPriority, setModalPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [modalIsCompleted, setModalIsCompleted] = useState(false);
  const [modalShiftChangeMemo, setModalShiftChangeMemo] = useState('');
  const [modalRecurrenceEnabled, setModalRecurrenceEnabled] = useState(false);
  const [modalRecurrenceRule, setModalRecurrenceRule] = useState<Omit<RecurrenceRule, 'endDate'> & { endDate?: string }>({
    frequency: 'weekly',
    interval: 1,
  });
  
  // List View Filter & Sort State
  const [listFilters, setListFilters] = useState<ListFiltersState>(() => {
    const savedFilters = localStorage.getItem('listFilters');
    const defaultFilters = {
        dateRange: { start: '', end: '' },
        priorities: [] as Array<'low' | 'medium' | 'high'>,
        status: 'all' as 'all' | 'completed' | 'incomplete'
    };
    if (savedFilters) {
        try {
            const parsed = JSON.parse(savedFilters);
            return { ...defaultFilters, ...parsed };
        } catch (e) {
            console.error("Failed to parse list filters from localStorage", e);
            return defaultFilters;
        }
    }
    return defaultFilters;
  });
  const [listSort, setListSort] = useState<ListSortState>({
      key: 'date' as 'date' | 'priority',
      direction: 'asc' as 'asc' | 'desc'
  });


  // --- I18N HELPER ---
  const t = useCallback((key: TranslationKey): string => {
      return translations[language][key] || translations.it[key];
  }, [language]);


  // --- EFFECTS ---

  // Save data to localStorage
  useEffect(() => { localStorage.setItem('shifts', JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { localStorage.setItem('shiftTypes', JSON.stringify(shiftTypes)); }, [shiftTypes]);
  useEffect(() => { localStorage.setItem('viewMode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('weekStartsOn', weekStartsOn); }, [weekStartsOn]);
  useEffect(() => { localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('fontFamily', fontFamily); }, [fontFamily]);
  useEffect(() => { localStorage.setItem('language', language); }, [language]);
  useEffect(() => { localStorage.setItem('customThemes', JSON.stringify(customThemes)); }, [customThemes]);
  useEffect(() => { localStorage.setItem('activeFilters', JSON.stringify(activeFilters)); }, [activeFilters]);
  useEffect(() => { localStorage.setItem('listFilters', JSON.stringify(listFilters)); }, [listFilters]);


  // Apply theme and font
  useEffect(() => {
    document.documentElement.lang = language;
    document.body.className = theme;
    document.documentElement.style.setProperty('--font-family', fontFamily);
    const currentThemeColors = customThemes[theme];
    const toKebabCase = (str: string) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
    Object.entries(currentThemeColors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${toKebabCase(key)}`, value);
    });
  }, [theme, fontFamily, customThemes, language]);

  // Reminder Effect
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    };
    requestNotificationPermission();

    const intervalId = setInterval(() => {
        const now = new Date();
        const remindersToFire = shifts.filter(shift =>
            shift.reminderDateTime && new Date(shift.reminderDateTime) <= now
        );
        
        if (remindersToFire.length > 0) {
            const currentTranslations = translations[language];
            const locale = language === 'it' ? 'it-IT' : 'en-US';

            remindersToFire.forEach(shift => {
                const shiftType = shiftTypes.find(st => st.id === shift.typeId);
                const shiftDate = new Date(shift.date);
                shiftDate.setUTCHours(12);
                const reminderTime = new Date(shift.reminderDateTime!);

                const notificationTitle = currentTranslations.reminderTitle;
                const notificationBody = currentTranslations.reminderBody
                    .replace('{shiftName}', shiftType?.name || 'Unknown')
                    .replace('{date}', shiftDate.toLocaleDateString(locale))
                    .replace('{time}', reminderTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }));

                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(notificationTitle, {
                        body: notificationBody,
                        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAIRlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAACQAAAAAQAAAJAAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAABCgAwAEAAAAAQAAABAAAAAAVMsswQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAVlpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wYWxldGE+CgCreativeWorkIOAAAARlSURBVDgRnY+xasNAEIY3k82oCF6Cx4L6sLd68eyt7UHxK/gKxYPg23f0A4gXwVv0L2S9xA8hNBFt572QZOBCyHswM8M3s/f2FmG0V0f2692Wcg/4BRG2L7Q4c43q0B/0vQ+REfG0M2/u/lQZ3wKIEsT0f6eGvBEFp3sxfZ4RXEcFo2Eh0yFnRIxJV8u+AxpYVGBGTe8aK5zMqmJ0xJxtiIuk+cf3w3R+K00R+vP+2sLRsTsQPYfD32hJ5aHVRfWdJ+Vz9A5+l77TCoY+9m4FL5/f+I/w3OHs3GbBqA62sM1+7nI72tZZw3QYjAAAAV3pUWHRSYXcgcHJvZmlsZSB0eXBlIGlwdGMAAHic4/IMCHFWKCjKT8vMSeVSAAMjCy5jCxMjE0uTFAMTIESANFCaZIuMBdEWwUwgGlwRRg3wCSDpmBILwAhxgPAMeQCiGBSzgCSI9wMA2fWS4wAAAANiS0dEAP74w5GAAAAAWEVSUk0xLjAuMgAAAExJR1SAZGF0YSAxODQzMEJaWjQyAAAAAGNvbXBvbmVudCB0eXBlIDUgICAgICAgICAgICAgIAprZXkgICAxAAAAIGNvcHlyaWdodCAxOSBleGFtcGxlLm9yZwB7j3wAAAAAAEFkb2JlIFhNUCBDb3JlIDYuMC4wAAAAr3poeAAAAABJRU5ErkJggg==',
                    });
                } else {
                    alert(`${notificationTitle}\n\n${notificationBody}`);
                }
            });

            setShifts(prevShifts =>
                prevShifts.map(s => remindersToFire.some(ur => ur.id === s.id) ? { ...s, reminderDateTime: undefined } : s)
            );
        }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [shifts, shiftTypes, language]);


  // --- HELPERS ---
  const dateToYMD = (date: Date) => date.toISOString().split('T')[0];
  
  const filteredShifts = useMemo(() => {
    if (activeFilters.length === shiftTypes.length) return shifts;
    return shifts.filter(shift => activeFilters.includes(shift.typeId));
  }, [shifts, activeFilters, shiftTypes]);

  const processedListShifts = useMemo(() => {
    let result = [...filteredShifts];

    if (listFilters.status === 'completed') result = result.filter(s => s.isCompleted);
    else if (listFilters.status === 'incomplete') result = result.filter(s => !s.isCompleted);

    if (listFilters.priorities.length > 0) result = result.filter(s => s.priority && listFilters.priorities.includes(s.priority));
    
    if (listFilters.dateRange.start) result = result.filter(s => s.date >= listFilters.dateRange.start);
    if (listFilters.dateRange.end) result = result.filter(s => s.date <= listFilters.dateRange.end);

    const priorityOrder = { high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
        let comparison = 0;
        if (listSort.key === 'date') {
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (listSort.key === 'priority') {
            const priorityA = priorityOrder[a.priority || 'low'] || 0;
            const priorityB = priorityOrder[b.priority || 'low'] || 0;
            comparison = priorityB - priorityA;
        }
        return listSort.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [filteredShifts, listFilters, listSort]);
  
  const areListFiltersActive = useMemo(() => {
    if (listFilters.dateRange.start || listFilters.dateRange.end) return true;
    if (listFilters.priorities.length > 0) return true;
    if (listFilters.status !== 'all') return true;
    return false;
  }, [listFilters]);


  const getShiftsForDate = useCallback((date: Date) => {
    const ymd = dateToYMD(date);
    return filteredShifts.filter(shift => shift.date === ymd);
  }, [filteredShifts]);

  const shiftTypeMap = useMemo(() => {
    return shiftTypes.reduce((acc, type) => {
      acc[type.id] = type;
      return acc;
    }, {} as Record<string, ShiftType>);
  }, [shiftTypes]);

  // --- MODAL HANDLERS ---
  const openShiftModal = (date: Date) => {
    setSelectedDate(date);
    const ymd = dateToYMD(date);
    const shiftOnDate = shifts.find(s => s.date === ymd);

    if (shiftOnDate) {
      setEditingShift(shiftOnDate);
      setModalShiftType(shiftOnDate.typeId);
      setModalStartTime(shiftOnDate.startTime || '');
      setModalEndTime(shiftOnDate.endTime || '');
      setModalNotes(shiftOnDate.notes || '');
      setModalDocuments(shiftOnDate.documents || []);
      setModalReminderEnabled(!!shiftOnDate.reminderDateTime);
      setModalReminderDateTime(shiftOnDate.reminderDateTime || '');
      setModalPriority(shiftOnDate.priority || 'medium');
      setModalIsCompleted(shiftOnDate.isCompleted || false);
      setModalShiftChangeMemo(shiftOnDate.shiftChangeMemo || '');

      const masterShift = shiftOnDate.recurrenceId 
            ? shifts.find(s => s.id === shiftOnDate.recurrenceId) 
            : shiftOnDate;
        
      if (masterShift?.recurrenceRule) {
          setModalRecurrenceEnabled(true);
          setModalRecurrenceRule({
              frequency: masterShift.recurrenceRule.frequency,
              interval: masterShift.recurrenceRule.interval,
              endDate: masterShift.recurrenceRule.endDate,
          });
      } else {
          setModalRecurrenceEnabled(false);
          setModalRecurrenceRule({ frequency: 'weekly', interval: 1 });
      }

    } else {
      setEditingShift(null);
      setModalShiftType(shiftTypes[0]?.id || '');
      setModalStartTime('');
      setModalEndTime('');
      setModalNotes('');
      setModalDocuments([]);
      setModalReminderEnabled(false);
      setModalReminderDateTime('');
      setModalPriority('medium');
      setModalIsCompleted(false);
      setModalShiftChangeMemo('');
      setModalRecurrenceEnabled(false);
      setModalRecurrenceRule({ frequency: 'weekly', interval: 1 });
    }
    setShiftModalOpen(true);
  };

  const closeShiftModal = () => {
    setShiftModalOpen(false);
    setSelectedDate(null);
    setEditingShift(null);
  };
  
  const generateRecurringShifts = (baseShift: Omit<ShiftData, 'id' | 'date' | 'isCompleted' | 'completionHistory'>, rule: RecurrenceRule, startDate: Date): ShiftData[] => {
        const newShifts: ShiftData[] = [];
        let currentDate = new Date(startDate);
        currentDate.setUTCHours(12);
        const endDateObj = new Date(rule.endDate);
        endDateObj.setUTCHours(12);

        const add = (d: Date, i: number, f: RecurrenceRule['frequency']) => {
            const newDate = new Date(d);
            if (f === 'daily') newDate.setDate(newDate.getDate() + i);
            else if (f === 'weekly') newDate.setDate(newDate.getDate() + i * 7);
            else if (f === 'monthly') newDate.setMonth(newDate.getMonth() + i);
            return newDate;
        };

        while (currentDate <= endDateObj) {
            newShifts.push({
                ...baseShift,
                id: `shift-${Date.now()}-${Math.random()}`,
                date: dateToYMD(currentDate),
                isCompleted: false, // Instances are not completed by default
                completionHistory: [],
            });
            currentDate = add(currentDate, rule.interval, rule.frequency);
        }
        return newShifts;
    };

  const handleSaveShift = () => {
    if (!selectedDate || !modalShiftType) return;
    
    if (editingShift?.recurrenceId) {
        setRecurrenceAction({ action: 'edit', shift: editingShift });
        setRecurrenceModalOpen(true);
        return;
    }

    const ymd = dateToYMD(selectedDate);
    const isDuplicate = shifts.some(
        shift =>
            shift.date === ymd &&
            shift.typeId === modalShiftType &&
            shift.startTime === modalStartTime &&
            shift.endTime === modalEndTime &&
            shift.id !== editingShift?.id
    );

    if (isDuplicate) {
        if (!window.confirm(t('duplicateShiftConfirm'))) return; 
    }
    
    if (modalRecurrenceEnabled && modalRecurrenceRule.endDate) {
        const recurrenceId = `shift-${Date.now()}`;
        const finalRule: RecurrenceRule = {
            frequency: modalRecurrenceRule.frequency,
            interval: modalRecurrenceRule.interval,
            endDate: modalRecurrenceRule.endDate,
        };

        const baseShift = {
            typeId: modalShiftType, startTime: modalStartTime, endTime: modalEndTime,
            notes: modalNotes, documents: modalDocuments,
            reminderDateTime: modalReminderEnabled ? modalReminderDateTime : undefined,
            priority: modalPriority, shiftChangeMemo: modalShiftChangeMemo,
            recurrenceId: recurrenceId, recurrenceRule: finalRule, originalDate: ymd
        };

        const newShifts = generateRecurringShifts(baseShift, finalRule, selectedDate);
        if (newShifts.length > 0) {
            newShifts[0].isCompleted = modalIsCompleted; // only first one can be pre-completed
        }

        setShifts(prev => {
            const otherShifts = editingShift ? prev.filter(s => s.id !== editingShift.id) : prev;
            // Also remove any existing shifts on the recurring dates to avoid overlap
            const recurringDates = new Set(newShifts.map(s => s.date));
            const filteredOldShifts = otherShifts.filter(s => !recurringDates.has(s.date));
            return [...filteredOldShifts, ...newShifts];
        });

    } else { // Single shift save
        let updatedHistory = editingShift?.completionHistory || [];
        if (editingShift && editingShift.isCompleted !== modalIsCompleted) {
            updatedHistory = [...updatedHistory, { status: modalIsCompleted ? 'completed' : 'incomplete', timestamp: new Date().toISOString() }];
        } else if (!editingShift && modalIsCompleted) {
            updatedHistory = [{ status: 'completed', timestamp: new Date().toISOString() }];
        }
        const newShift: ShiftData = {
            id: editingShift?.id || `shift-${Date.now()}`, date: ymd, typeId: modalShiftType,
            startTime: modalStartTime, endTime: modalEndTime, notes: modalNotes,
            documents: modalDocuments, reminderDateTime: modalReminderEnabled ? modalReminderDateTime : undefined,
            priority: modalPriority, isCompleted: modalIsCompleted, completionHistory: updatedHistory,
            shiftChangeMemo: modalShiftChangeMemo,
            // Detach from recurrence if it was part of one
            recurrenceId: editingShift?.recurrenceId ? undefined : editingShift?.recurrenceId,
        };
        setShifts(prev => {
            const otherShifts = prev.filter(s => s.id !== newShift.id);
            return [...otherShifts, newShift];
        });
    }

    closeShiftModal();
  };
  
    const handleRecurrenceAction = (type: 'thisInstanceOnly' | 'thisAndFutureInstances' | 'allInstances') => {
        if (!recurrenceAction) return;
        const { action, shift } = recurrenceAction;
        const { recurrenceId, date: currentDateYMD } = shift;

        const getShiftDataFromModal = (baseShift: ShiftData): ShiftData => {
            // ... builds a new shift object from modal state ...
             let updatedHistory = baseShift.completionHistory || [];
             if (baseShift.isCompleted !== modalIsCompleted) {
                updatedHistory = [...updatedHistory, { status: modalIsCompleted ? 'completed' : 'incomplete', timestamp: new Date().toISOString() }];
             }
             return {
                 ...baseShift,
                 typeId: modalShiftType, startTime: modalStartTime, endTime: modalEndTime,
                 notes: modalNotes, documents: modalDocuments,
                 reminderDateTime: modalReminderEnabled ? modalReminderDateTime : undefined,
                 priority: modalPriority, isCompleted: modalIsCompleted, completionHistory: updatedHistory,
                 shiftChangeMemo: modalShiftChangeMemo,
             };
        };

        if (action === 'edit') {
            const newShiftData = getShiftDataFromModal(shift);
            setShifts(prevShifts => {
                let updatedShifts = [...prevShifts];
                if (type === 'thisInstanceOnly') {
                    // Detach this one and update it
                    updatedShifts = updatedShifts.map(s => s.id === shift.id ? { ...newShiftData, recurrenceId: undefined, recurrenceRule: undefined, originalDate: undefined } : s);
                } else {
                    const seriesShifts = updatedShifts.filter(s => s.recurrenceId === recurrenceId);
                    const masterShift = seriesShifts.find(s => s.id === s.recurrenceId) || seriesShifts.find(s=>s.originalDate);
                    const originalDate = masterShift?.originalDate || seriesShifts[0]?.date || currentDateYMD;

                    const affectedShifts = type === 'allInstances'
                        ? seriesShifts
                        : seriesShifts.filter(s => s.date >= currentDateYMD);

                    const affectedIds = new Set(affectedShifts.map(s => s.id));
                    updatedShifts = updatedShifts.filter(s => !affectedIds.has(s.id));
                    
                    const newRuleEnabled = modalRecurrenceEnabled && modalRecurrenceRule.endDate;

                    if (type === 'thisAndFutureInstances') {
                       // End the previous series
                       const dayBefore = new Date(currentDateYMD);
                       dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
                       const newEndDate = dateToYMD(dayBefore);

                       updatedShifts = updatedShifts.map(s => {
                           if (s.recurrenceId === recurrenceId && s.date < currentDateYMD) {
                               return { ...s, recurrenceRule: { ...s.recurrenceRule!, endDate: newEndDate } };
                           }
                           return s;
                       });
                    }
                    
                    if(newRuleEnabled){
                        const newRecurrenceId = `shift-${Date.now()}`;
                        const newRule = { ...modalRecurrenceRule, endDate: modalRecurrenceRule.endDate! };
                        const newBaseShift = {
                            ...newShiftData,
                            recurrenceId: newRecurrenceId,
                            recurrenceRule: newRule,
                            originalDate: type === 'allInstances' ? originalDate : currentDateYMD,
                        };
                        const newGeneratedShifts = generateRecurringShifts(newBaseShift, newRule, new Date(newBaseShift.originalDate));
                        updatedShifts.push(...newGeneratedShifts);
                    } else { // Not recurring anymore, just update affected
                        affectedShifts.forEach(s => {
                            updatedShifts.push({ ...getShiftDataFromModal(s), recurrenceId: undefined, recurrenceRule: undefined, originalDate: undefined });
                        });
                    }
                }
                return updatedShifts;
            });

        } else if (action === 'delete') {
            setShifts(prevShifts => {
                if (type === 'thisInstanceOnly') {
                    return prevShifts.filter(s => s.id !== shift.id);
                }
                const affectedIds = new Set(
                    prevShifts.filter(s =>
                        s.recurrenceId === recurrenceId && (type === 'allInstances' || s.date >= currentDateYMD)
                    ).map(s => s.id)
                );
                let updatedShifts = prevShifts.filter(s => !affectedIds.has(s.id));

                if (type === 'thisAndFutureInstances') {
                    const dayBefore = new Date(currentDateYMD);
                    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
                    const newEndDate = dateToYMD(dayBefore);
                    updatedShifts = updatedShifts.map(s =>
                        s.recurrenceId === recurrenceId ? { ...s, recurrenceRule: { ...s.recurrenceRule!, endDate: newEndDate } } : s
                    );
                }
                return updatedShifts;
            });
        }
        
        closeShiftModal();
        setRecurrenceModalOpen(false);
        setRecurrenceAction(null);
    };


  const handleDeleteShift = () => {
    if (!editingShift) return;
    if (editingShift.recurrenceId) {
        setRecurrenceAction({ action: 'delete', shift: editingShift });
        setRecurrenceModalOpen(true);
    } else {
        setShifts(prev => prev.filter(s => s.id !== editingShift.id));
        closeShiftModal();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if(file.size > 2 * 1024 * 1024) { // 2MB limit
      alert(t('fileTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: file.type,
        content: event.target?.result as string,
      };
      setModalDocuments(prev => [...prev, newDoc]);
    };
    reader.readAsDataURL(file);
  };

  const deleteDocument = (docId: string) => {
    setModalDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const handleDownloadDocument = (doc: Document) => {
    const link = document.createElement('a');
    link.href = doc.content;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getIconForFileType = (type: string) => {
      if (type.startsWith('image/')) return null;
      if (type.includes('pdf')) return '📄';
      if (type.includes('word')) return '📝';
      if (type.includes('sheet') || type.includes('excel')) return '📊';
      return '📁';
  };

  const handleSaveShiftTypes = (newTypes: ShiftType[]) => {
    setShiftTypes(newTypes);
    setActiveFilters(prevFilters => {
        const newTypeIds = newTypes.map(t => t.id);
        return prevFilters.filter(fId => newTypeIds.includes(fId));
    });
    setCustomizeModalOpen(false);
  };

  const toggleShiftCompletion = (shiftId: string) => {
    setShifts(prevShifts => 
        prevShifts.map(s => {
            if (s.id === shiftId) {
                const newStatus = !s.isCompleted;
                const newHistoryEntry: ShiftCompletionHistory = {
                    status: newStatus ? 'completed' : 'incomplete',
                    timestamp: new Date().toISOString()
                };
                const updatedHistory = [...(s.completionHistory || []), newHistoryEntry];
                return { 
                    ...s, 
                    isCompleted: newStatus,
                    completionHistory: updatedHistory
                };
            }
            return s;
        })
    );
  };

  // --- EXPORT FUNCTIONS ---
  const exportToPDF = () => {
    const dataToExport = viewMode === 'list' 
        ? processedListShifts 
        : filteredShifts.filter(s => {
              const shiftDate = new Date(s.date);
              return shiftDate.getMonth() === currentDate.getMonth() && shiftDate.getFullYear() === currentDate.getFullYear();
          }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    doc.autoTable({
        head: [[t('date'), t('shiftType'), t('priority'), t('status'), t('time'), t('notes'), t('shiftChangeMemo')]],
        body: dataToExport.map(s => [
            s.date,
            shiftTypeMap[s.typeId]?.name || t('na'),
            s.priority === 'high' ? t('high') : s.priority === 'medium' ? t('medium') : t('low'),
            s.isCompleted ? t('completed') : t('incomplete'),
            s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : t('na'),
            s.notes || '',
            s.shiftChangeMemo || ''
        ]),
    });
    doc.save('turni.pdf');
  };

  const exportToCSV = () => {
     const dataToExport = viewMode === 'list' 
        ? processedListShifts 
        : filteredShifts.filter(s => {
              const shiftDate = new Date(s.date);
              return shiftDate.getMonth() === currentDate.getMonth() && shiftDate.getFullYear() === currentDate.getFullYear();
          }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const headers = [t('date'), t('shiftType'), t('priority'), t('status'), t('startTime'), t('endTime'), t('notes'), t('shiftChangeMemo')].join(',');
    let csvContent = `data:text/csv;charset=utf-8,${headers}\r\n`;

    dataToExport.forEach(s => {
        const priorityLabel = s.priority === 'high' ? t('high') : s.priority === 'medium' ? t('medium') : t('low');
        const row = [
            s.date,
            shiftTypeMap[s.typeId]?.name || t('na'),
            priorityLabel,
            s.isCompleted ? t('completed') : t('incomplete'),
            s.startTime || '',
            s.endTime || '',
            `"${s.notes?.replace(/"/g, '""') || ''}"`,
            `"${s.shiftChangeMemo?.replace(/"/g, '""') || ''}"`
        ].join(',');
        csvContent += row + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "turni.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // --- RENDER LOGIC ---
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    let startDayOffset = firstDayOfMonth.getDay();
    if (weekStartsOn === 'monday') {
      startDayOffset = (startDayOffset === 0) ? 6 : startDayOffset - 1;
    }

    const days = [];
    for (let i = 0; i < startDayOffset; i++) {
      days.push(<div key={`empty-start-${i}`} className="calendar-day empty"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const shiftsOnDate = getShiftsForDate(date);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      const shift = shiftsOnDate.length > 0 ? shiftsOnDate[0] : null;
      const shiftType = shift ? shiftTypeMap[shift.typeId] : null;
      const locale = language === 'it' ? 'it-IT' : 'en-US';

      days.push(
        <div 
          key={i} 
          className={`calendar-day ${isToday ? 'today' : ''}`} 
          onClick={() => openShiftModal(date)}
          style={{ backgroundColor: shiftType ? shiftType.color + '33' : 'transparent' }}
        >
          <div className="day-number">{i}</div>
          {shiftType && (
            <div className="shift-info">
              <span className="shift-icon">{shiftType.icon}</span>
              <span className="shift-name">{shiftType.name}</span>
            </div>
          )}
           <div className="indicators">
                {shift?.recurrenceId && <span className="note-indicator" title={t('containsRecurrence')}>🔁</span>}
                {shift?.shiftChangeMemo && <span className="note-indicator" title={t('containsShiftChangeMemo')}>🔄</span>}
                {shift?.notes && <span className="note-indicator" title={t('containsNotes')}>🗒️</span>}
                {shift?.documents && shift.documents.length > 0 && <span className="document-indicator" title={t('containsDocuments')}>📎</span>}
                {shift?.reminderDateTime && <span className="reminder-indicator" title={`${t('reminderSetFor')} ${new Date(shift.reminderDateTime).toLocaleString(locale)}`}>⏰</span>}
            </div>
        </div>
      );
    }

    const dayNames = weekStartsOn === 'monday' 
        ? [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')] 
        : [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];

    return (
      <>
        <div className="calendar-header">
            {dayNames.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="calendar-grid">{days}</div>
      </>
    );
  };
  
  const renderList = () => {
    const locale = language === 'it' ? 'it-IT' : 'en-US';
    return (
        <div className="list-view">
            {processedListShifts.length > 0 ? processedListShifts.map(shift => {
                const shiftType = shiftTypeMap[shift.typeId];
                const date = new Date(shift.date);
                date.setUTCHours(12);

                const lastHistory = shift.completionHistory?.[shift.completionHistory.length - 1];
                let historyTitle = shift.isCompleted ? t('markAsIncomplete') : t('markAsComplete');
                if (lastHistory) {
                    const historyDate = new Date(lastHistory.timestamp).toLocaleString(locale);
                    const statusText = lastHistory.status === 'completed'
                        ? t('completedOn').replace('{date}', historyDate)
                        : t('incompletedOn').replace('{date}', historyDate);
                    historyTitle += `\n(${statusText})`;
                }

                return (
                    <div key={shift.id} className={`list-item ${shift.isCompleted ? 'completed' : ''}`} style={{ borderLeftColor: shiftType?.color || '#ccc' }}>
                        <div className="list-item-main-content" onClick={() => openShiftModal(date)}>
                            <div className="list-item-date">
                                <span className={`priority-indicator ${shift.priority || 'medium'}`}></span>
                                <span className="day-name">{date.toLocaleDateString(locale, { weekday: 'short' })}</span>
                                <span className="day-number">{date.getDate()}</span>
                            </div>
                            <div className="list-item-info">
                                <span className="shift-icon-name">{shiftType?.icon} {shiftType?.name}</span>
                                {shift.startTime && shift.endTime && <span className="shift-time">{shift.startTime} - {shift.endTime}</span>}
                                <div className="shift-status">
                                    <span className={`status-icon ${shift.isCompleted ? 'completed-icon' : 'incomplete-icon'}`}></span>
                                    <span>{shift.isCompleted ? t('completed') : t('incomplete')}</span>
                                </div>
                            </div>
                            <div className="indicators">
                               {shift.recurrenceId && <span className="note-indicator" title={t('containsRecurrence')}>🔁</span>}
                               {shift.shiftChangeMemo && <span className="note-indicator" title={t('containsShiftChangeMemo')}>🔄</span>}
                               {shift.notes && <span className="note-indicator" title={t('containsNotes')}>🗒️</span>}
                               {shift.documents && shift.documents.length > 0 && <span className="document-indicator" title={t('containsDocuments')}>📎</span>}
                               {shift.reminderDateTime && <span className="reminder-indicator" title={`${t('reminderSetFor')} ${new Date(shift.reminderDateTime).toLocaleString(locale)}`}>⏰</span>}
                            </div>
                        </div>
                        <div className="list-item-actions">
                            <input
                                type="checkbox"
                                className="complete-checkbox"
                                checked={shift.isCompleted || false}
                                onChange={() => toggleShiftCompletion(shift.id)}
                                title={historyTitle}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                );
            }) : <p className="no-shifts">{t('noShiftsFound')}</p>}
        </div>
    );
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };


  return (
    <div className="app-container">
      <header className="app-header">
        {viewMode === 'grid' && <button onClick={() => changeMonth(-1)}>&lt;</button>}
        <h2>{currentDate.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'long', year: 'numeric' })}</h2>
        {viewMode === 'grid' && <button onClick={() => changeMonth(1)}>&gt;</button>}
        
        <div className="header-controls">
            <button
                className={`header-icon filter-btn ${activeFilters.length !== shiftTypes.length ? 'active' : ''}`}
                onClick={() => setFilterPopoverOpen(true)}
                aria-label={t('filterShifts')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            </button>
            {isFilterPopoverOpen && (
                <FilterPopover
                    shiftTypes={shiftTypes}
                    activeFilters={activeFilters}
                    setActiveFilters={setActiveFilters}
                    onClose={() => setFilterPopoverOpen(false)}
                    t={t}
                />
            )}
            <button className="header-icon" onClick={() => setHelpModalOpen(true)} aria-label={t('help')}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
            </button>
            <button className="header-icon" onClick={() => setSettingsModalOpen(true)} aria-label={t('settings')}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
            </button>
        </div>
      </header>

      {viewMode === 'list' && (
        <div className="list-view-header">
            <button 
                className={`list-filter-button ${areListFiltersActive ? 'active' : ''}`}
                onClick={() => setListFilterModalOpen(true)}
            >
                {areListFiltersActive 
                    ? <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.94 4.94l-2.12-2.12-1.41 1.41 2.12 2.12 1.41-1.41zm-2.83 2.83l-1.41 1.41 2.12 2.12 1.41-1.41-2.12-2.12zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.12-3.51l1.41-1.41 2.12 2.12-1.41 1.41-2.12-2.12zM4.94 9.06L7.06 11.18l1.41-1.41L6.36 7.64 4.94 9.06z"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>
                }
                {t('filterAndSort')}
            </button>
        </div>
      )}

      {viewMode === 'grid' ? renderCalendar() : renderList()}
      
      {/* Shift Modal */}
      {isShiftModalOpen && (
        <div className="modal-backdrop" onClick={closeShiftModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>
                {modalShiftType && shiftTypeMap[modalShiftType] && (
                    <span className="modal-header-color-indicator" style={{ backgroundColor: shiftTypeMap[modalShiftType].color }}></span>
                )}
                {editingShift ? t('editShift') : t('addShift')} - {selectedDate?.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US')}
            </h3>
            
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="shift-type">{t('shiftType')}</label>
                    <select id="shift-type" value={modalShiftType} onChange={e => setModalShiftType(e.target.value)}>
                    {shiftTypes.map(st => <option key={st.id} value={st.id}>{st.icon} {st.name}</option>)}
                    </select>
                </div>
                 <div className="form-group">
                    <label htmlFor="priority">{t('priority')}</label>
                    <select id="priority" value={modalPriority} onChange={e => setModalPriority(e.target.value as any)}>
                        <option value="low">{t('low')}</option>
                        <option value="medium">{t('medium')}</option>
                        <option value="high">{t('high')}</option>
                    </select>
                </div>
            </div>
            
            <div className="time-inputs">
                <div>
                    <label htmlFor="start-time">{t('startTime')}</label>
                    <input id="start-time" type="time" value={modalStartTime} onChange={e => setModalStartTime(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="end-time">{t('endTime')}</label>
                    <input id="end-time" type="time" value={modalEndTime} onChange={e => setModalEndTime(e.target.value)} />
                </div>
            </div>

            <label htmlFor="notes">{t('notes')}</label>
            <textarea id="notes" value={modalNotes} onChange={e => setModalNotes(e.target.value)} placeholder={t('notesPlaceholder')}></textarea>
            
            <label htmlFor="shift-change-memo">{t('shiftChangeMemo')}</label>
            <textarea id="shift-change-memo" value={modalShiftChangeMemo} onChange={e => setModalShiftChangeMemo(e.target.value)} placeholder={t('shiftChangeMemoPlaceholder')}></textarea>

            <div className="documents-section">
                <label htmlFor="document-upload" className="file-input-label">{t('addDocument')}</label>
                <input id="document-upload" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} />
                 <ul className="document-list">
                    {modalDocuments.map(doc => {
                        const icon = getIconForFileType(doc.type);
                        return (
                            <li key={doc.id} className="document-list-item">
                                {icon ? <span className="document-icon">{icon}</span> : <img src={doc.content} alt={doc.name} className="document-preview" />}
                                <span className="document-name" title={doc.name}>{doc.name}</span>
                                <div className="document-actions">
                                    <button onClick={() => handleDownloadDocument(doc)} className="btn-icon btn-download-doc" title={t('download')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                    </button>
                                    <button onClick={() => deleteDocument(doc.id)} className="btn-icon btn-delete-doc" title={t('delete')}>&times;</button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
            
            <div className="recurrence-section">
                <div className="form-group-inline">
                    <input type="checkbox" id="recurrence-enabled" checked={modalRecurrenceEnabled} onChange={e => setModalRecurrenceEnabled(e.target.checked)} />
                    <label htmlFor="recurrence-enabled">{t('setAsRecurring')}</label>
                </div>
                {modalRecurrenceEnabled && (
                    <div className="recurrence-options">
                        <div className="form-group">
                            <label>{t('repeats')}</label>
                            <select value={modalRecurrenceRule.frequency} onChange={e => setModalRecurrenceRule(p => ({...p, frequency: e.target.value as any}))}>
                                <option value="daily">{t('daily')}</option>
                                <option value="weekly">{t('weekly')}</option>
                                <option value="monthly">{t('monthly')}</option>
                            </select>
                        </div>
                        <div className="form-group interval-group">
                             <label>{t('every')}</label>
                             <input type="number" min="1" value={modalRecurrenceRule.interval} onChange={e => setModalRecurrenceRule(p => ({...p, interval: Math.max(1, parseInt(e.target.value, 10)) || 1}))} />
                             <span>
                                {modalRecurrenceRule.frequency === 'daily' ? t('day_s') : modalRecurrenceRule.frequency === 'weekly' ? t('week_s') : t('month_s')}
                             </span>
                        </div>
                        <div className="form-group">
                            <label>{t('endDateRecurrence')}</label>
                            <input type="date" value={modalRecurrenceRule.endDate} onChange={e => setModalRecurrenceRule(p => ({...p, endDate: e.target.value}))} />
                        </div>
                    </div>
                )}
            </div>


            <div className="reminder-section">
                <input type="checkbox" id="reminder-enabled" checked={modalReminderEnabled} onChange={e => setModalReminderEnabled(e.target.checked)} />
                <label htmlFor="reminder-enabled">{t('setReminder')}</label>
                {modalReminderEnabled && <input type="datetime-local" value={modalReminderDateTime} onChange={e => setModalReminderDateTime(e.target.value)} />}
            </div>

            <div className="form-group-inline">
                 <input type="checkbox" id="is-completed" checked={modalIsCompleted} onChange={e => setModalIsCompleted(e.target.checked)} />
                 <label htmlFor="is-completed">{t('completed')}</label>
            </div>
            
            {editingShift?.completionHistory && editingShift.completionHistory.length > 0 && (
              <div className="history-section">
                <h4>{t('completionHistory')}</h4>
                <ul className="history-list">
                  {[...editingShift.completionHistory].reverse().map((entry, index) => (
                    <li key={index}>
                      <span className={`history-status ${entry.status}`}>
                        {entry.status === 'completed' ? t('complete') : t('incomplete')}
                      </span>
                      <span className="history-timestamp">
                        {new Date(entry.timestamp).toLocaleString(language === 'it' ? 'it-IT' : 'en-US')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}


            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSaveShift}>{t('save')}</button>
              {editingShift && <button className="btn-danger" onClick={handleDeleteShift}>{t('delete')}</button>}
              <button onClick={closeShiftModal}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Recurrence Confirmation Modal */}
      {isRecurrenceModalOpen && recurrenceAction && (
          <RecurrenceConfirmationModal
              action={recurrenceAction.action}
              onConfirm={handleRecurrenceAction}
              onClose={() => setRecurrenceModalOpen(false)}
              t={t}
          />
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && <SettingsModal
          viewMode={viewMode} setViewMode={setViewMode}
          weekStartsOn={weekStartsOn} setWeekStartsOn={setWeekStartsOn}
          theme={theme} setTheme={setTheme}
          fontFamily={fontFamily} setFontFamily={setFontFamily}
          language={language} setLanguage={setLanguage}
          onClose={() => setSettingsModalOpen(false)}
          onExportPDF={exportToPDF}
          onExportCSV={exportToCSV}
          onCustomize={() => { setSettingsModalOpen(false); setCustomizeModalOpen(true); }}
          onCustomizeTheme={() => { setSettingsModalOpen(false); setThemeModalOpen(true); }}
          t={t}
      />}

      {/* Customize Shift Types Modal */}
      {isCustomizeModalOpen && <CustomizeShiftTypesModal
          initialTypes={shiftTypes}
          onSave={handleSaveShiftTypes}
          onClose={() => setCustomizeModalOpen(false)}
          t={t}
      />}

      {/* Theme Customizer Modal */}
      {isThemeModalOpen && <ThemeCustomizerModal
        customThemes={customThemes}
        setCustomThemes={setCustomThemes}
        onClose={() => setThemeModalOpen(false)}
        t={t}
      />}

      {/* Help Modal */}
      {isHelpModalOpen && <HelpModal onClose={() => setHelpModalOpen(false)} language={language} t={t} />}

      {/* List Filter Modal */}
      {isListFilterModalOpen && <ListFilterModal
        initialFilters={listFilters}
        initialSort={listSort}
        onApply={(newFilters, newSort) => {
            setListFilters(newFilters);
            setListSort(newSort);
            setListFilterModalOpen(false);
        }}
        onClose={() => setListFilterModalOpen(false)}
        t={t}
       />}
    </div>
  );
};


// --- SUB-COMPONENTS ---
interface RecurrenceConfirmationModalProps {
    action: 'edit' | 'delete';
    onConfirm: (type: 'thisInstanceOnly' | 'thisAndFutureInstances' | 'allInstances') => void;
    onClose: () => void;
    t: (key: TranslationKey) => string;
}
const RecurrenceConfirmationModal: React.FC<RecurrenceConfirmationModalProps> = ({ action, onConfirm, onClose, t }) => {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content recurrence-confirmation" onClick={e => e.stopPropagation()}>
                <h3>{action === 'edit' ? t('editRecurringShift') : t('deleteRecurringShift')}</h3>
                <p>{action === 'edit' ? t('editRecurrenceQuestion') : t('deleteRecurrenceQuestion')}</p>
                <div className="modal-actions column">
                    <button onClick={() => onConfirm('thisInstanceOnly')}>{t('thisInstanceOnly')}</button>
                    <button onClick={() => onConfirm('thisAndFutureInstances')}>{t('thisAndFutureInstances')}</button>
                    <button onClick={() => onConfirm('allInstances')}>{t('allInstances')}</button>
                    <button onClick={onClose} style={{ marginTop: '10px' }}>{t('cancel')}</button>
                </div>
            </div>
        </div>
    );
};

interface ListFilterModalProps {
    initialFilters: ListFiltersState;
    initialSort: ListSortState;
    onApply: (filters: ListFiltersState, sort: ListSortState) => void;
    onClose: () => void;
    t: (key: TranslationKey) => string;
}

const ListFilterModal: React.FC<ListFilterModalProps> = ({ initialFilters, initialSort, onApply, onClose, t }) => {
    const [filters, setFilters] = useState(initialFilters);
    const [sort, setSort] = useState(initialSort);

    const handleFilterChange = (key: keyof typeof filters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handlePriorityToggle = (priority: 'low' | 'medium' | 'high') => {
        const newPriorities = filters.priorities.includes(priority)
            ? filters.priorities.filter(p => p !== priority)
            : [...filters.priorities, priority];
        handleFilterChange('priorities', newPriorities);
    };
    
    const handleReset = () => {
        const defaultFilters = {
            dateRange: { start: '', end: '' },
            priorities: [],
            status: 'all' as 'all' | 'completed' | 'incomplete'
        };
        const defaultSort = {
            key: 'date' as 'date' | 'priority',
            direction: 'asc' as 'asc' | 'desc'
        };
        setFilters(defaultFilters);
        setSort(defaultSort);
        onApply(defaultFilters, defaultSort); // Apply and close
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>{t('filterAndSort')}</h3>

                <div className="filter-modal-section">
                    <h4>{t('filterByDate')}</h4>
                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('startDate')}</label>
                            <input type="date" value={filters.dateRange.start} onChange={e => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>{t('endDate')}</label>
                            <input type="date" value={filters.dateRange.end} onChange={e => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div className="filter-modal-section">
                    <h4>{t('priority')}</h4>
                     <div className="priority-toggles">
                        {(['low', 'medium', 'high'] as const).map(p => {
                            const label = p === 'low' ? t('low') : p === 'medium' ? t('medium') : t('high');
                            return (
                                <button
                                    key={p}
                                    className={`${p} ${filters.priorities.includes(p) ? 'active' : ''}`}
                                    onClick={() => handlePriorityToggle(p)}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="filter-modal-section">
                    <h4>{t('status')}</h4>
                    <div className="radio-group">
                       <label><input type="radio" name="status" value="all" checked={filters.status === 'all'} onChange={e => handleFilterChange('status', e.target.value)} />{t('all')}</label>
                       <label><input type="radio" name="status" value="incomplete" checked={filters.status === 'incomplete'} onChange={e => handleFilterChange('status', e.target.value)} />{t('incomplete')}</label>
                       <label><input type="radio" name="status" value="completed" checked={filters.status === 'completed'} onChange={e => handleFilterChange('status', e.target.value)} />{t('complete')}</label>
                    </div>
                </div>

                <div className="filter-modal-section">
                    <h4>{t('sortBy')}</h4>
                     <div className="form-row">
                        <div className="form-group">
                           <label>{t('sortBy')}</label>
                           <select value={sort.key} onChange={e => setSort(prev => ({...prev, key: e.target.value as any}))}>
                               <option value="date">{t('date')}</option>
                               <option value="priority">{t('priority')}</option>
                           </select>
                        </div>
                         <div className="form-group">
                           <label>{t('sortDirection')}</label>
                           <div className="radio-group horizontal">
                               <label><input type="radio" name="direction" value="asc" checked={sort.direction === 'asc'} onChange={() => setSort(prev => ({...prev, direction: 'asc'}))} />{t('ascending')} (↑)</label>
                               <label><input type="radio" name="direction" value="desc" checked={sort.direction === 'desc'} onChange={() => setSort(prev => ({...prev, direction: 'desc'}))} />{t('descending')} (↓)</label>
                           </div>
                        </div>
                    </div>
                </div>
                
                <div className="modal-actions">
                    <button onClick={handleReset}>{t('reset')}</button>
                    <div style={{flexGrow: 1}}></div>
                    <button onClick={onClose}>{t('cancel')}</button>
                    <button className="btn-primary" onClick={() => onApply(filters, sort)}>{t('apply')}</button>
                </div>
            </div>
        </div>
    );
};


interface FilterPopoverProps {
    shiftTypes: ShiftType[];
    activeFilters: string[];
    setActiveFilters: (filters: string[]) => void;
    onClose: () => void;
    t: (key: TranslationKey) => string;
}
const FilterPopover: React.FC<FilterPopoverProps> = ({ shiftTypes, activeFilters, setActiveFilters, onClose, t }) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleToggleFilter = (typeId: string) => {
        setActiveFilters(
            activeFilters.includes(typeId)
                ? activeFilters.filter(id => id !== typeId)
                : [...activeFilters, typeId]
        );
    };

    const selectAll = () => setActiveFilters(shiftTypes.map(st => st.id));
    const deselectAll = () => setActiveFilters([]);
    
    const filteredTypes = useMemo(() => 
        shiftTypes.filter(type =>
            type.name.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [shiftTypes, searchTerm]);


    return (
        <div className="filter-popover" ref={popoverRef}>
            <h4>{t('filterShiftTypes')}</h4>
            <input
                type="text"
                className="filter-search-input"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="filter-list">
                {filteredTypes.map(type => (
                    <label key={type.id} className="filter-item">
                        <input type="checkbox" checked={activeFilters.includes(type.id)} onChange={() => handleToggleFilter(type.id)} />
                        <span className="filter-color-dot" style={{ backgroundColor: type.color }}></span>
                        {type.icon} {type.name}
                    </label>
                ))}
            </div>
            <div className="filter-actions">
                <button onClick={selectAll}>{t('selectAll')}</button>
                <button onClick={deselectAll}>{t('deselectAll')}</button>
            </div>
        </div>
    );
};

interface SettingsModalProps {
  viewMode: 'grid' | 'list'; setViewMode: (v: 'grid' | 'list') => void;
  weekStartsOn: 'monday' | 'sunday'; setWeekStartsOn: (v: 'monday' | 'sunday') => void;
  theme: 'light' | 'dark'; setTheme: (v: 'light' | 'dark') => void;
  fontFamily: string; setFontFamily: (v: string) => void;
  language: 'it' | 'en'; setLanguage: (v: 'it' | 'en') => void;
  onClose: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onCustomize: () => void;
  onCustomizeTheme: () => void;
  t: (key: TranslationKey) => string;
}
const SettingsModal: React.FC<SettingsModalProps> = ({
  viewMode, setViewMode, weekStartsOn, setWeekStartsOn, theme, setTheme, fontFamily, setFontFamily, language, setLanguage,
  onClose, onExportPDF, onExportCSV, onCustomize, onCustomizeTheme, t
}) => {
  const fonts = ['Roboto', 'Merriweather', 'Nunito', 'Inconsolata'];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <h3>{t('settings')}</h3>
        
        <div className="setting-group">
          <h4>{t('display')}</h4>
          <label><input type="radio" name="viewMode" value="grid" checked={viewMode === 'grid'} onChange={() => setViewMode('grid')} /> {t('grid')}</label>
          <label><input type="radio" name="viewMode" value="list" checked={viewMode === 'list'} onChange={() => setViewMode('list')} /> {t('list')}</label>
          <hr/>
          <label>{t('weekStart')}:</label>
          <select value={weekStartsOn} onChange={e => setWeekStartsOn(e.target.value as any)}>
            <option value="monday">{t('monday')}</option>
            <option value="sunday">{t('sunday')}</option>
          </select>
        </div>

        <div className="setting-group">
            <h4>{t('appearance')}</h4>
            <label>{t('language')}:</label>
            <select value={language} onChange={e => setLanguage(e.target.value as any)}>
                <option value="it">{t('italian')}</option>
                <option value="en">{t('english')}</option>
            </select>
            <hr />
            <label>{t('theme')}</label>
            <div className="theme-switcher">
              <input type="radio" id="theme-light" name="theme" value="light" checked={theme === 'light'} onChange={() => setTheme('light')} />
              <label htmlFor="theme-light">{t('light')}</label>
              <input type="radio" id="theme-dark" name="theme" value="dark" checked={theme === 'dark'} onChange={() => setTheme('dark')} />
              <label htmlFor="theme-dark">{t('dark')}</label>
            </div>
            <hr />
             <label>{t('appFont')}</label>
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              {fonts.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <hr />
            <button onClick={onCustomizeTheme}>{t('customizeThemeColors')}</button>
        </div>

        <div className="setting-group">
          <h4>{t('data')}</h4>
          <button onClick={onExportPDF}>{t('exportPDF')}</button>
          <button onClick={onExportCSV}>{t('exportCSV')}</button>
        </div>

         <div className="setting-group">
            <h4>{t('customization')}</h4>
            <button onClick={onCustomize}>{t('customizeShiftTypes')}</button>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    </div>
  );
};

interface CustomizeShiftTypesModalProps {
    initialTypes: ShiftType[];
    onSave: (types: ShiftType[]) => void;
    onClose: () => void;
    t: (key: TranslationKey) => string;
}
const CustomizeShiftTypesModal: React.FC<CustomizeShiftTypesModalProps> = ({ initialTypes, onSave, onClose, t }) => {
    const [types, setTypes] = useState(initialTypes);

    const handleTypeChange = (id: string, field: keyof ShiftType, value: string) => {
        setTypes(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content large" onClick={e => e.stopPropagation()}>
                <h3>{t('customizeShiftTypesTitle')}</h3>
                {types.map(type => (
                    <div key={type.id} className="customize-item">
                        <input type="color" value={type.color} onChange={e => handleTypeChange(type.id, 'color', e.target.value)} />
                        <input type="text" value={type.name} onChange={e => handleTypeChange(type.id, 'name', e.target.value)} />
                        <select value={type.icon} onChange={e => handleTypeChange(type.id, 'icon', e.target.value)}>
                            {AVAILABLE_ICONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                        </select>
                        <input 
                          type="text" 
                          className="custom-icon-input"
                          placeholder={t('customIconPlaceholder')}
                          defaultValue={AVAILABLE_ICONS.includes(type.icon) ? '' : type.icon}
                          onChange={e => handleTypeChange(type.id, 'icon', e.target.value)}
                          maxLength={2}
                        />
                    </div>
                ))}
                 <div className="modal-actions">
                    <button className="btn-primary" onClick={() => onSave(types)}>{t('save')}</button>
                    <button onClick={onClose}>{t('cancel')}</button>
                </div>
            </div>
        </div>
    );
};

interface ThemeCustomizerModalProps {
    customThemes: CustomThemes;
    setCustomThemes: React.Dispatch<React.SetStateAction<CustomThemes>>;
    onClose: () => void;
    t: (key: TranslationKey) => string;
}
const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ customThemes, setCustomThemes, onClose, t }) => {
    
    const handleColorChange = (theme: 'light' | 'dark', key: keyof ThemeColors, value: string) => {
        setCustomThemes(prev => ({ ...prev, [theme]: { ...prev[theme], [key]: value } }));
    };

    const handleResetTheme = (theme: 'light' | 'dark') => {
        setCustomThemes(prev => ({ ...prev, [theme]: DEFAULT_THEME_COLORS[theme] }));
    };

    const renderThemeEditor = (theme: 'light' | 'dark') => {
        const themeData = customThemes[theme];
        const colorLabels: Record<keyof ThemeColors, string> = {
            primaryColor: t('primary'), secondaryColor: t('secondary'), dangerColor: t('danger'),
            textColor: t('text'), bgColor: t('background'), bgSecondaryColor: t('backgroundSecondary'),
            borderColor: t('border'), headerBg: t('headerBackground'), inputBg: t('inputBackground'),
            inputBorder: t('inputBorder'), modalBg: t('modalBackground'),
        };

        return (
            <div className="theme-customizer-column">
                <h4>{theme === 'light' ? t('themeLight') : t('themeDark')}</h4>
                {Object.keys(colorLabels).map(key => (
                    <div key={`${theme}-${key}`} className="color-input-group">
                        <label htmlFor={`${theme}-${key}`}>{colorLabels[key as keyof ThemeColors]}</label>
                        <input
                            type="color"
                            id={`${theme}-${key}`}
                            value={themeData[key as keyof ThemeColors]}
                            onChange={e => handleColorChange(theme, key as keyof ThemeColors, e.target.value)}
                        />
                    </div>
                ))}
                <button onClick={() => handleResetTheme(theme)} style={{marginTop: '10px', width: '100%'}}>{t('resetToDefaults')}</button>
            </div>
        );
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content large" onClick={e => e.stopPropagation()}>
                <h3>{t('customizeThemes')}</h3>
                <div className="theme-customizer-content">
                    {renderThemeEditor('light')}
                    {renderThemeEditor('dark')}
                </div>
                <div className="modal-actions">
                    <button className="btn-primary" onClick={onClose}>{t('done')}</button>
                </div>
            </div>
        </div>
    );
};

interface HelpModalProps {
    onClose: () => void;
    language: 'it' | 'en';
    t: (key: TranslationKey) => string;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose, language, t }) => {
    const helpContent = {
        it: (
            <>
                <h4>Gestione dei Turni</h4>
                <p>Clicca su un giorno (vista Griglia) o su un turno esistente (vista Lista) per aprire la finestra di dialogo. Qui puoi aggiungere un nuovo turno o modificare quello esistente. Puoi specificare il tipo, l'orario, la priorità, le note e allegare documenti.</p>
                <h4>Turni Ricorrenti</h4>
                <p>Nella finestra di dialogo del turno, spunta "Imposta come ricorrente" per creare turni che si ripetono giornalmente, settimanalmente o mensilmente fino a una data di fine. Quando modifichi o cancelli un turno ricorrente, ti verrà chiesto se applicare la modifica solo a quel giorno, a quel giorno e ai futuri, o a tutta la serie.</p>
                <h4>Cambio Visualizzazione</h4>
                <p>Vai su <strong>Impostazioni</strong> (icona ingranaggio) per passare dalla vista <strong>Griglia</strong> (calendario) alla vista <strong>Lista</strong>.</p>
                <h4>Filtri e Ordinamento</h4>
                <p><strong>Vista Griglia:</strong> Clicca l'icona a forma di imbuto nell'intestazione per mostrare o nascondere specifici tipi di turno dal calendario.</p>
                <p><strong>Vista Lista:</strong> Clicca il pulsante <strong>Filtra e Ordina</strong> per aprire un pannello dove puoi filtrare i turni per intervallo di date, priorità (Bassa, Media, Alta) e stato (Tutti, Da Fare, Completati). Puoi anche ordinare i risultati per data o priorità.</p>
                <h4>Promemoria</h4>
                <p>Quando aggiungi o modifichi un turno, puoi impostare un promemoria spuntando la casella "Imposta Promemoria" e scegliendo una data e un'ora. Riceverai una notifica push (se autorizzata) o un avviso in-app.</p>
                <h4>Personalizzazione</h4>
                <p>Nelle <strong>Impostazioni</strong>, puoi personalizzare completamente l'applicazione:</p>
                <ul>
                    <li><strong>Personalizza Tipi di Turno:</strong> Cambia nomi, colori e icone dei tuoi turni.</li>
                    <li><strong>Personalizza Colori Tema:</strong> Modifica i colori per i temi Chiaro e Scuro per adattarli al tuo stile.</li>
                    <li><strong>Lingua:</strong> Scegli tra Italiano e Inglese per l'intera interfaccia.</li>
                </ul>
                <h4>Esportazione Dati</h4>
                <p>Nelle <strong>Impostazioni</strong>, trovi le opzioni per esportare i turni attualmente visualizzati (filtrati e ordinati) in formato <strong>PDF</strong> o <strong>CSV</strong> per condividerli o archiviarli.</p>
            </>
        ),
        en: (
             <>
                <h4>Managing Shifts</h4>
                <p>Click on a day (Grid view) or an existing shift (List view) to open the dialog box. Here you can add a new shift or edit an existing one. You can specify the type, time, priority, notes, and attach documents.</p>
                <h4>Recurring Shifts</h4>
                <p>In the shift dialog, check "Set as recurring" to create shifts that repeat daily, weekly, or monthly until an end date. When editing or deleting a recurring shift, you'll be asked whether to apply the change to just that day, that day and future ones, or the entire series.</p>
                <h4>Switching Views</h4>
                <p>Go to <strong>Settings</strong> (gear icon) to switch between the <strong>Grid</strong> view (calendar) and the <strong>List</strong> view.</p>
                <h4>Filtering and Sorting</h4>
                <p><strong>Grid View:</strong> Click the funnel icon in the header to show or hide specific shift types from the calendar.</p>
                <p><strong>List View:</strong> Click the <strong>Filter & Sort</strong> button to open a panel where you can filter shifts by date range, priority (Low, Medium, High), and status (All, Incomplete, Completed). You can also sort the results by date or priority.</p>
                <h4>Reminders</h4>
                <p>When adding or editing a shift, you can set a reminder by checking the "Set Reminder" box and choosing a date and time. You will receive a push notification (if allowed) or an in-app alert.</p>
                <h4>Customization</h4>
                <p>In <strong>Settings</strong>, you can fully customize the application:</p>
                <ul>
                    <li><strong>Customize Shift Types:</strong> Change the names, colors, and icons of your shifts.</li>
                    <li><strong>Customize Theme Colors:</strong> Modify the colors for the Light and Dark themes to match your style.</li>
                    <li><strong>Language:</strong> Choose between Italian and English for the entire interface.</li>
                </ul>
                <h4>Exporting Data</h4>
                <p>In <strong>Settings</strong>, you'll find options to export the currently displayed shifts (filtered and sorted) to <strong>PDF</strong> or <strong>CSV</strong> format for sharing or archiving.</p>
            </>
        )
    };
    
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content large help-modal-content" onClick={e => e.stopPropagation()}>
                <h3>{t('helpTitle')}</h3>
                <div className="help-content">
                    {helpContent[language]}
                </div>
                <div className="modal-actions">
                    <button className="btn-primary" onClick={onClose}>{t('close')}</button>
                </div>
            </div>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
