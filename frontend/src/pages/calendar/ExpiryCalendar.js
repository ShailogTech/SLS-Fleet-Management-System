import React, { useEffect, useState } from 'react';
import { useRefresh } from '../../contexts/RefreshContext';
import api from '../../utils/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import TruckLoader from '../../components/common/TruckLoader';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle,
  Truck,
  User,
  Calendar,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { buttonVariants } from '../../components/ui/button';
import { toast } from 'sonner';

const DOC_TYPE_LABELS = {
  insurance_expiry: 'Insurance',
  fitness_expiry: 'Fitness Certificate',
  puc_expiry: 'PUC Certificate',
  permit_expiry: 'Permit',
  tax_expiry: 'Tax',
  rc_expiry: 'RC Registration Date',
  dl_expiry: 'Driving License',
  hazardous_cert_expiry: 'Hazardous Certificate',
};

const STATUS_CONFIG = {
  expired: { label: 'Expired', color: 'bg-red-100 text-red-800', dotColor: 'bg-red-500' },
  expiring_soon: { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-800', dotColor: 'bg-amber-500' },
  valid: { label: 'Valid', color: 'bg-emerald-100 text-emerald-800', dotColor: 'bg-emerald-500' },
};

const ExpiryCalendar = () => {
  const { registerRefresh } = useRefresh();
  const [calendarData, setCalendarData] = useState({});
  const [summary, setSummary] = useState({ total: 0, total_expired: 0, total_expiring_soon: 0, total_valid: 0 });
  const [selectedDay, setSelectedDay] = useState(null);
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  useEffect(() => { registerRefresh(fetchCalendarData); }, []);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/expiry-calendar');
      setCalendarData(response.data.calendar || {});
      setSummary(response.data.summary || { total: 0, total_expired: 0, total_expiring_soon: 0, total_valid: 0 });
    } catch (error) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  // Build modifier maps for the calendar
  const expiredDays = [];
  const expiringSoonDays = [];
  const validDays = [];

  Object.entries(calendarData).forEach(([dateStr, docs]) => {
    const date = parseISO(dateStr);
    const hasExpired = docs.some(d => d.status === 'expired');
    const hasExpiringSoon = docs.some(d => d.status === 'expiring_soon');

    if (hasExpired) {
      expiredDays.push(date);
    } else if (hasExpiringSoon) {
      expiringSoonDays.push(date);
    } else {
      validDays.push(date);
    }
  });

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedDocs = selectedDateStr ? (calendarData[selectedDateStr] || []) : [];

  if (loading) {
    return <TruckLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Document Expiry Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">Visual overview of document expiry dates across your fleet</p>
        </div>
        <Button variant="outline" onClick={fetchCalendarData}>
          <RefreshCw className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Documents</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total}</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Expired</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{summary.total_expired}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Expiring in 30 Days</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{summary.total_expiring_soon}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Valid</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.total_valid}</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Expired</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Expiring Soon</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Valid</span>
      </div>

      {/* Calendar + Detail Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar - Left Side */}
        <Card className="border-slate-200 lg:col-span-3">
          <CardContent className="p-6">
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              month={month}
              onMonthChange={setMonth}
              showOutsideDays
              modifiers={{
                expired: expiredDays,
                expiringSoon: expiringSoonDays,
                valid: validDays,
              }}
              modifiersClassNames={{
                expired: 'rdp-day--expired',
                expiringSoon: 'rdp-day--expiring-soon',
                valid: 'rdp-day--valid',
              }}
              className="mx-auto"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 w-full",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-lg font-semibold text-slate-900",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                  buttonVariants({ variant: "outline" }),
                  "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex justify-around",
                head_cell: "text-slate-500 rounded-md w-14 font-medium text-sm py-2",
                row: "flex w-full mt-1 justify-around",
                cell: "relative text-center text-sm focus-within:relative focus-within:z-20 h-14 w-14",
                day: cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-14 w-14 p-0 font-normal aria-selected:opacity-100 relative"
                ),
                day_selected: "bg-slate-900 text-white hover:bg-slate-800 hover:text-white focus:bg-slate-900 focus:text-white",
                day_today: "bg-slate-100 text-slate-900 font-semibold",
                day_outside: "text-slate-300 opacity-50",
                day_disabled: "text-slate-300 opacity-50",
                day_hidden: "invisible",
              }}
              components={{
                IconLeft: () => <ChevronLeft className="h-5 w-5" />,
                IconRight: () => <ChevronRight className="h-5 w-5" />,
                DayContent: ({ date }) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const docs = calendarData[dateStr];
                  const hasExpired = docs?.some(d => d.status === 'expired');
                  const hasExpiringSoon = docs?.some(d => d.status === 'expiring_soon');
                  const hasValid = docs?.some(d => d.status === 'valid') && !hasExpired && !hasExpiringSoon;
                  const docCount = docs?.length || 0;

                  return (
                    <div className="flex flex-col items-center">
                      <span>{date.getDate()}</span>
                      {docs && (
                        <div className="flex gap-0.5 mt-0.5">
                          {hasExpired && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                          {hasExpiringSoon && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                          {hasValid && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                        </div>
                      )}
                    </div>
                  );
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Detail Panel - Right Side */}
        <Card className="border-slate-200 lg:col-span-2 h-fit lg:sticky lg:top-6">
          <CardContent className="p-6">
            {!selectedDay ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-slate-500">Select a date</p>
                <p className="text-sm mt-1">Click on any date to see expiring documents</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {format(selectedDay, 'MMM d, yyyy')}
                  </h2>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {selectedDocs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-300" />
                    <p className="font-medium">No documents expire on this date</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-500 mb-3">
                      {selectedDocs.length} document{selectedDocs.length > 1 ? 's' : ''} expiring
                    </p>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {selectedDocs.map((doc, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "p-3 rounded-lg border transition-all hover:shadow-sm",
                            doc.status === 'expired' && "bg-red-50 border-red-200",
                            doc.status === 'expiring_soon' && "bg-amber-50 border-amber-200",
                            doc.status === 'valid' && "bg-emerald-50 border-emerald-200"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {doc.entity_type === 'vehicle' ? (
                                <div className="bg-blue-100 p-1.5 rounded">
                                  <Truck className="h-3.5 w-3.5 text-blue-600" />
                                </div>
                              ) : (
                                <div className="bg-purple-100 p-1.5 rounded">
                                  <User className="h-3.5 w-3.5 text-purple-600" />
                                </div>
                              )}
                              <span className="text-xs uppercase font-medium text-slate-500">
                                {doc.entity_type}
                              </span>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 text-xs font-semibold rounded-full",
                              STATUS_CONFIG[doc.status]?.color
                            )}>
                              {STATUS_CONFIG[doc.status]?.label}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900 text-sm">{doc.entity_name}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpiryCalendar;
