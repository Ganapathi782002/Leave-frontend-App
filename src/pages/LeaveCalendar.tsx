import { useEffect, useState, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import './LeaveCalendar.css';

const localizer = momentLocalizer(moment);

interface BackendCalendarEvent {
    leave_id: number;
    title: string;
    start: string;
    end: string;
    userName: string;
    userEmail: string;
    leaveTypeName: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Awaiting_Admin_Approval';
}

interface FormattedCalendarEvent {
    leave_id: number;
    title: string;
    start: Date;
    end: Date;
    userName: string;
    userEmail: string;
    leaveTypeName: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Awaiting_Admin_Approval';
    allDay: boolean;
}

interface User {
    user_id: number;
    email: string;
    role_id: number;
    name: string;
    manager_id?: number | null;
}

function LeaveCalendar() {
    const { user, isAuthenticated, loading: authLoading } = useAuth() as {
        user: User | null;
        isAuthenticated: boolean;
        loading: boolean;
    };

    const [events, setEvents] = useState<FormattedCalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchCalendarEvents = useCallback(async () => {
        if (authLoading) {
            setLoading(true);
            return;
        }
        if (!isAuthenticated || !user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data: BackendCalendarEvent[] = await api('/api/leaves/calendar/leave-availability', 'GET');

            const formattedEvents: FormattedCalendarEvent[] = data.map(event => {
                const startDate = moment(event.start).toDate();

                const endDate = moment(event.end).add(1, 'day').toDate();

                console.log(`Original: ${event.start} - ${event.end}`);
                console.log(`Formatted: ${startDate.toLocaleString()} - ${endDate.toLocaleString()}`);


                return {
                    ...event,
                    title: `${event.userName} - ${event.leaveTypeName}`,
                    start: startDate,
                    end: endDate,
                    allDay: true,
                };
            });

            setEvents(formattedEvents);
            console.log("LeaveCalendar: Fetched events:", formattedEvents);
        } catch (err: any) {
            console.error("LeaveCalendar: Error fetching calendar events:", err);
            setError(err.message || "Failed to fetch calendar events.");
        } finally {
            setLoading(false);
        }
    }, [user, isAuthenticated, authLoading]);

    useEffect(() => {
        fetchCalendarEvents();
    }, [fetchCalendarEvents]);

    const handleNavigate = useCallback((newDate: Date) => {
        setCurrentDate(newDate);
    }, []);

    const dayPropGetter = useCallback((date: Date) => {
        const day = date.getDay();
        if (day === 0 || day === 6) {
            return {
                className: 'weekend-day-cell',
            };
        }
        return {};
    }, []);

    const eventPropGetter = useCallback((event: FormattedCalendarEvent) => {
        let classNames = ['rbc-event'];

        switch (event.leaveTypeName.toLowerCase()) {
            case 'casual leave':
                classNames.push('leave-type-casual');
                break;
            case 'sick leave':
                classNames.push('leave-type-sick');
                break;
            default:
                classNames.push('leave-type-default');
                break;
        }

        return {
            className: classNames.join(' '),
        };
    }, []);


    if (authLoading) {
        return <div className="calendar-loading">Loading authentication state...</div>;
    }

    if (!user) {
        return <div className="calendar-unauthenticated">Please log in to view the calendar.</div>;
    }

    if (loading) {
        return <div className="calendar-loading">Loading leave availability calendar...</div>;
    }

    if (error) {
        return <div className="calendar-error">Error: {error}</div>;
    }

    const EventComponent = ({ event }: { event: FormattedCalendarEvent }) => (
        <div className="calendar-event-content">
            <strong>{event.userName}</strong>
            <p>{event.leaveTypeName}</p>
        </div>
    );

    return (
        <div className="leave-calendar-container">
            <h2 className="page-title">Leave Availability Calendar</h2>
            <div className="calendar-role-info">
                {user.role_id === 1 && <p>As an <strong>Admin</strong>, you are viewing all approved leaves.</p>}
                {user.role_id === 3 && <p>As a **Manager**, you are viewing approved leaves for your *direct reports and your own*.</p>}
                {(user.role_id === 2 || user.role_id === 4) && <p>As an **Employee/Intern**, you are viewing approved leaves for your *teammates, manager, and your own*.</p>}
            </div>
            {events.length === 0 && !loading && (
                <p className="no-events-message">No approved leaves found for your view criteria.</p>
            )}
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                defaultView="month"
                style={{ height: 700 }}
                views={['month', 'week', 'day', 'agenda']}
                date={currentDate}
                onNavigate={handleNavigate}
                dayPropGetter={dayPropGetter}
                eventPropGetter={eventPropGetter}
                components={{
                    event: EventComponent,
                }}
            />
        </div>
    );
}

export default LeaveCalendar;