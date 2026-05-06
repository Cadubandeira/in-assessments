import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, BarChart3, CalendarRange, Check, ClipboardList, Loader2, Maximize2, Minimize2, Search, Users, X } from 'lucide-react';
import { useUserRole } from '../../hooks/useUserRole';
import { TOKENS } from '../../config/tokens';
import { supabase } from '../../supabaseClient';
import ManagementSkeleton from '../../components/skeletons/admin/ManagementSkeleton';

const USERS_PAGE_SIZE = 30;
const TABLE_ROW_HEIGHT = 44;
const TABLE_OVERSCAN = 10;
const TABLE_VIRTUALIZATION_THRESHOLD = 120;

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

const getStartDateFromDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const formatDateBr = (isoDate) => {
  if (!isoDate) return '-';
  const [year, month, day] = String(isoDate).split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};

const normalizeIndicatorScores = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') {
    return [];
  }

  return Object.entries(snapshot)
    .map(([key, value]) => {
      if (!value || typeof value !== 'object') return null;

      const score = Number(value.score ?? value.value ?? 0);
      const maxScore = Number(value.max_score ?? value.maxScore ?? 0);
      const rawPercentage = Number(value.percentage ?? value.percent ?? 0);
      const percentage = Number.isFinite(rawPercentage) && rawPercentage > 0
        ? rawPercentage
        : maxScore > 0
          ? (score / maxScore) * 100
          : 0;

      return {
        key,
        name: value.name || (!isUuid(key) ? key : 'Indicador'),
        percentage: Number.isFinite(percentage) ? percentage : 0
      };
    })
    .filter(Boolean);
};

const getEventPercentage = (event) => {
  const total = Number(event?.total_score || 0);
  const max = Number(event?.max_possible_score || 0);
  if (!max) return 0;
  return (total / max) * 100;
};

const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;

const compareValues = (left, right, direction = 'asc') => {
  const multiplier = direction === 'desc' ? -1 : 1;
  const leftMissing = left === null || left === undefined || left === '';
  const rightMissing = right === null || right === undefined || right === '';

  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    return (left - right) * multiplier;
  }

  return String(left).localeCompare(String(right), 'pt-BR', { numeric: true, sensitivity: 'base' }) * multiplier;
};

const Panel = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, loading: roleLoading } = useUserRole();
  const usersListRef = useRef(null);
  const tableScrollRef = useRef(null);
  const usersRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const metaRequestIdRef = useRef(0);
  const hydratedFromUrlRef = useRef(false);

  const [assessments, setAssessments] = useState([]);
  const [allUsersLoaded, setAllUsersLoaded] = useState([]);
  const [usersCursor, setUsersCursor] = useState(0);
  const [usersHasMore, setUsersHasMore] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState(null);

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [events, setEvents] = useState([]);
  const [columnEvents, setColumnEvents] = useState([]);

  const [assessmentMode, setAssessmentMode] = useState('all');
  const [userMode, setUserMode] = useState('all');
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [tableMode, setTableMode] = useState('summary');

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const defaultDateStartRef = useRef(getStartDateFromDays(90));
  const defaultDateEndRef = useRef(getTodayIsoDate());

  const [dateStart, setDateStart] = useState(defaultDateStartRef.current);
  const [dateEnd, setDateEnd] = useState(defaultDateEndRef.current);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [tableViewportHeight, setTableViewportHeight] = useState(560);
  const [sortConfig, setSortConfig] = useState({ key: 'userName', direction: 'asc' });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (hydratedFromUrlRef.current) return;

    const pAssessmentMode = searchParams.get('am');
    const pUserMode = searchParams.get('um');
    const pAssessmentIds = searchParams.get('aids');
    const pUserIds = searchParams.get('uids');
    const pTableMode = searchParams.get('tm');
    const pDateStart = searchParams.get('ds');
    const pDateEnd = searchParams.get('de');
    const pSearch = searchParams.get('q');
    const pSortKey = searchParams.get('sk');
    const pSortDirection = searchParams.get('sd');

    if (pAssessmentMode === 'all' || pAssessmentMode === 'specific') {
      setAssessmentMode(pAssessmentMode);
    }

    if (pUserMode === 'all' || pUserMode === 'specific') {
      setUserMode(pUserMode);
    }

    if (pAssessmentIds) {
      setSelectedAssessmentIds(pAssessmentIds.split(',').filter(Boolean));
    }

    if (pUserIds) {
      setSelectedUserIds(pUserIds.split(',').filter(Boolean));
    }

    if (pTableMode === 'summary' || pTableMode === 'detailed') {
      setTableMode(pTableMode);
    }

    if (pDateStart) {
      setDateStart(pDateStart);
    }

    if (pDateEnd) {
      setDateEnd(pDateEnd);
    }

    if (pSearch) {
      setSearchInput(pSearch);
      setSearchTerm(pSearch);
    }

    if (pSortKey && (pSortDirection === 'asc' || pSortDirection === 'desc')) {
      setSortConfig({ key: pSortKey, direction: pSortDirection });
    }

    hydratedFromUrlRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!hydratedFromUrlRef.current) return;

    const nextParams = new URLSearchParams();
    nextParams.set('am', assessmentMode);
    nextParams.set('um', userMode);
    nextParams.set('tm', tableMode);

    if (selectedAssessmentIds.length > 0) {
      nextParams.set('aids', selectedAssessmentIds.join(','));
    }

    if (selectedUserIds.length > 0) {
      nextParams.set('uids', selectedUserIds.join(','));
    }

    if (dateStart) {
      nextParams.set('ds', dateStart);
    }

    if (dateEnd) {
      nextParams.set('de', dateEnd);
    }

    if (searchInput.trim()) {
      nextParams.set('q', searchInput.trim());
    }

    if (sortConfig?.key) {
      nextParams.set('sk', sortConfig.key);
      nextParams.set('sd', sortConfig.direction);
    }

    setSearchParams(nextParams, { replace: true });
  }, [assessmentMode, userMode, tableMode, selectedAssessmentIds, selectedUserIds, dateStart, dateEnd, searchInput, sortConfig, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setUsersCursor(0);
      setUsersHasMore(true);
      setAllUsersLoaded([]);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      navigate('/dashboard');
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!isFullscreen) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isFullscreen]);

  const loadUsersPage = async (start = 0) => {
    if (loadingUsers) return;
    if (!usersHasMore && start > 0) return;

    const requestId = ++usersRequestIdRef.current;
    setLoadingUsers(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, display_name, role', { count: 'exact' })
        .order('display_name', { ascending: true, nullsFirst: false })
        .range(start, start + USERS_PAGE_SIZE - 1);

      if (searchTerm) {
        query = query.ilike('display_name', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (requestId !== usersRequestIdRef.current) return;

      const rows = data || [];
      setAllUsersLoaded((prev) => {
        if (start === 0) return rows;

        const existingIds = new Set(prev.map((u) => u.id));
        const deduped = rows.filter((u) => !existingIds.has(u.id));
        return [...prev, ...deduped];
      });

      setUsersCursor(start + rows.length);
      setUsersHasMore(rows.length === USERS_PAGE_SIZE);
    } catch (err) {
      if (requestId === usersRequestIdRef.current) {
        setMetaError(err.message || String(err));
      }
    } finally {
      if (requestId === usersRequestIdRef.current) {
        setLoadingUsers(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadMeta = async () => {
      const requestId = ++metaRequestIdRef.current;
      try {
        setLoadingMeta(true);
        setMetaError(null);

        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from('assessments')
          .select('id, name, schema, is_active')
          .order('name', { ascending: true });

        if (assessmentsError) throw assessmentsError;
        if (!mounted || requestId !== metaRequestIdRef.current) return;

        setAssessments(assessmentsData || []);
      } catch (err) {
        if (mounted && requestId === metaRequestIdRef.current) {
          setMetaError(err.message || String(err));
        }
      } finally {
        if (mounted && requestId === metaRequestIdRef.current) setLoadingMeta(false);
      }
    };

    if (role === 'admin') {
      loadMeta();
    }

    return () => {
      mounted = false;
    };
  }, [role]);

  useEffect(() => {
    if (role !== 'admin') return;
    loadUsersPage(0);
  }, [role, searchTerm]);

  const selectedAssessments = useMemo(() => {
    if (assessmentMode === 'all') return assessments;
    const selectedSet = new Set(selectedAssessmentIds);
    return assessments.filter((assessment) => selectedSet.has(assessment.id));
  }, [assessmentMode, assessments, selectedAssessmentIds]);

  const selectedUsers = useMemo(() => {
    if (userMode === 'all') return allUsersLoaded;
    const selectedSet = new Set(selectedUserIds);
    return allUsersLoaded.filter((profile) => selectedSet.has(profile.id));
  }, [userMode, allUsersLoaded, selectedUserIds]);

  const loadDetail = async () => {
    if (role !== 'admin') return;

    if (dateStart && dateEnd && dateStart > dateEnd) {
      setDetailError('Intervalo de datas inválido. Ajuste início e fim do período.');
      setEvents([]);
      return;
    }

    const requestId = ++detailRequestIdRef.current;

    setLoadingDetail(true);
    setDetailError(null);

    try {
      let detailsQuery = supabase
        .from('assessment_events')
        .select('id, user_id, assessment_id, total_score, max_possible_score, executed_at, created_at, indicator_scores_snapshot, user_display_name')
        .order('executed_at', { ascending: false })
        .limit(5000);

      let columnsQuery = supabase
        .from('assessment_events')
        .select('assessment_id, indicator_scores_snapshot')
        .order('executed_at', { ascending: false })
        .limit(5000);

      if (dateStart) {
        detailsQuery = detailsQuery.gte('executed_at', `${dateStart}T00:00:00`);
        columnsQuery = columnsQuery.gte('executed_at', `${dateStart}T00:00:00`);
      }
      if (dateEnd) {
        detailsQuery = detailsQuery.lte('executed_at', `${dateEnd}T23:59:59`);
        columnsQuery = columnsQuery.lte('executed_at', `${dateEnd}T23:59:59`);
      }

      if (assessmentMode !== 'all' && selectedAssessmentIds.length > 0) {
        detailsQuery = detailsQuery.in('assessment_id', selectedAssessmentIds);
        columnsQuery = columnsQuery.in('assessment_id', selectedAssessmentIds);
      }

      if (userMode !== 'all' && selectedUserIds.length > 0) {
        detailsQuery = detailsQuery.in('user_id', selectedUserIds);
      }

      const [detailsResult, columnsResult] = await Promise.all([
        detailsQuery,
        userMode === 'all' ? Promise.resolve(null) : columnsQuery
      ]);

      if (detailsResult.error) throw detailsResult.error;
      if (columnsResult?.error) throw columnsResult.error;
      if (requestId !== detailRequestIdRef.current) return;

      const detailRows = detailsResult.data || [];
      setEvents(detailRows);
      setColumnEvents(userMode === 'all' ? detailRows : (columnsResult?.data || []));
    } catch (err) {
      if (requestId === detailRequestIdRef.current) {
        setDetailError(err.message || String(err));
        setEvents([]);
        setColumnEvents([]);
      }
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setLoadingDetail(false);
      }
    }
  };

  useEffect(() => {
    loadDetail();
  }, [role, assessmentMode, userMode, selectedAssessmentIds, selectedUserIds, dateStart, dateEnd]);

  const onUsersScroll = () => {
    const el = usersListRef.current;
    if (!el || loadingUsers || !usersHasMore) return;

    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
    if (nearBottom) {
      loadUsersPage(usersCursor);
    }
  };

  const onTableScroll = () => {
    const el = tableScrollRef.current;
    if (!el) return;
    setTableScrollTop(el.scrollTop);
  };

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const updateHeight = () => {
      setTableViewportHeight(el.clientHeight || 560);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(el);

    return () => observer.disconnect();
  }, [events.length, tableMode]);

  const assessmentNameById = useMemo(() => {
    const map = {};
    assessments.forEach((assessment) => {
      map[assessment.id] = assessment.name;
    });
    return map;
  }, [assessments]);

  const userMap = useMemo(() => {
    const map = {};
    allUsersLoaded.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [allUsersLoaded]);

  const detailData = useMemo(() => {
    const eventList = events || [];
    const assessmentIdsInScope = selectedAssessments.map((a) => a.id);

    const userEventsMap = new Map();
    eventList.forEach((event) => {
      if (!event.user_id) return;
      if (!userEventsMap.has(event.user_id)) {
        userEventsMap.set(event.user_id, []);
      }
      userEventsMap.get(event.user_id).push(event);
    });

    const userIdsInScope = userMode === 'all'
      ? Array.from(userEventsMap.keys())
      : selectedUsers.map((u) => u.id);

    const rows = userIdsInScope.map((userId) => {
      const userEvents = userEventsMap.get(userId) || [];
      const row = {
        userId,
        userName: userMap[userId]?.display_name || userEvents[0]?.user_display_name || 'Usuário',
        userRole: userMap[userId]?.role || '-',
        summaryByAssessment: {},
        detailByAssessmentIndicator: {}
      };

      const summaryByAssessment = {};
      userEvents.forEach((event) => {
        const assessmentId = event.assessment_id;
        if (!assessmentId) return;

        if (!summaryByAssessment[assessmentId]) {
          summaryByAssessment[assessmentId] = {
            latest: event,
            executions: 0
          };
        }

        summaryByAssessment[assessmentId].executions += 1;
      });

      assessmentIdsInScope.forEach((assessmentId) => {
        const summary = summaryByAssessment[assessmentId];
        const latest = summary?.latest || null;

        row.summaryByAssessment[assessmentId] = {
          lastPercentage: latest ? getEventPercentage(latest) : null,
          executions: summary?.executions || 0
        };

        if (latest?.indicator_scores_snapshot) {
          const indicators = normalizeIndicatorScores(latest.indicator_scores_snapshot);
          indicators.forEach((indicator) => {
            const colKey = `${assessmentId}__${indicator.name}`;
            row.detailByAssessmentIndicator[colKey] = indicator.percentage;
          });
        }
      });

      return row;
    });

    const detailedColumnsSet = new Set();

    // Build detailed columns from all events in the current scope so columns remain
    // visible even when the latest row value is missing for a given user.
    const columnEventList = columnEvents || [];
    columnEventList.forEach((event) => {
      const assessmentId = event?.assessment_id;
      if (!assessmentId) return;

      const indicators = normalizeIndicatorScores(event?.indicator_scores_snapshot);
      indicators.forEach((indicator) => {
        detailedColumnsSet.add(`${assessmentId}__${indicator.name}`);
      });
    });

    rows.forEach((row) => {
      Object.keys(row.detailByAssessmentIndicator).forEach((k) => detailedColumnsSet.add(k));
    });

    const detailedColumns = Array.from(detailedColumnsSet)
      .map((colKey) => {
        const [assessmentId, indicatorName] = colKey.split('__');
        return {
          key: colKey,
          assessmentId,
          indicatorName
        };
      })
      .sort((a, b) => {
        const byAssessment = (assessmentNameById[a.assessmentId] || '').localeCompare(assessmentNameById[b.assessmentId] || '', 'pt-BR');
        if (byAssessment !== 0) return byAssessment;
        return a.indicatorName.localeCompare(b.indicatorName, 'pt-BR');
      });

    const uniqueUsersWithData = new Set(eventList.map((e) => e.user_id).filter(Boolean)).size;
    const avgScore = eventList.length === 0
      ? 0
      : eventList.reduce((acc, e) => acc + getEventPercentage(e), 0) / eventList.length;

    return {
      rows,
      detailedColumns,
      kpis: {
        usersCount: uniqueUsersWithData,
        assessmentsCount: new Set(eventList.map((e) => e.assessment_id).filter(Boolean)).size,
        executionsCount: eventList.length,
        avgScore
      }
    };
  }, [events, columnEvents, selectedAssessments, userMode, selectedUsers, userMap, assessmentNameById]);

  const dynamicColumnCount = useMemo(() => {
    if (tableMode === 'summary') {
      return selectedAssessments.length * 2;
    }
    return detailData.detailedColumns.length;
  }, [tableMode, selectedAssessments.length, detailData.detailedColumns.length]);

  const detailedAssessmentGroups = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    detailData.detailedColumns.forEach((column) => {
      if (!groupMap.has(column.assessmentId)) {
        const nextGroup = {
          assessmentId: column.assessmentId,
          assessmentName: assessmentNameById[column.assessmentId] || 'Assessment',
          columns: []
        };
        groupMap.set(column.assessmentId, nextGroup);
        groups.push(nextGroup);
      }

      groupMap.get(column.assessmentId).columns.push(column);
    });

    return groups;
  }, [detailData.detailedColumns, assessmentNameById]);

  const detailedColumnBoundaryMap = useMemo(() => {
    const boundaryMap = {};

    detailData.detailedColumns.forEach((column, index) => {
      const prev = detailData.detailedColumns[index - 1];
      const next = detailData.detailedColumns[index + 1];
      boundaryMap[column.key] = {
        isStart: !prev || prev.assessmentId !== column.assessmentId,
        isEnd: !next || next.assessmentId !== column.assessmentId
      };
    });

    return boundaryMap;
  }, [detailData.detailedColumns]);

  const isDefaultAssessmentFilter = assessmentMode === 'all' && selectedAssessmentIds.length === 0;
  const isDefaultUserFilter = userMode === 'all' && selectedUserIds.length === 0 && !searchInput.trim();
  const isDefaultPeriodFilter = dateStart === defaultDateStartRef.current && dateEnd === defaultDateEndRef.current;

  const resetAssessmentFilter = () => {
    setAssessmentMode('all');
    setSelectedAssessmentIds([]);
  };

  const resetUserFilter = () => {
    setUserMode('all');
    setSelectedUserIds([]);
    setSearchInput('');
    setSearchTerm('');
  };

  const resetPeriodFilter = () => {
    setDateStart(defaultDateStartRef.current);
    setDateEnd(defaultDateEndRef.current);
  };

  const clearAllFilters = () => {
    resetAssessmentFilter();
    resetUserFilter();
    resetPeriodFilter();
  };

  const sortedRows = useMemo(() => {
    const rows = [...detailData.rows];
    const currentSort = sortConfig?.key ? sortConfig : { key: 'userName', direction: 'asc' };

    const getSortValue = (row) => {
      if (currentSort.key === 'userName') return row.userName;
      if (currentSort.key === 'userRole') return row.userRole;

      if (currentSort.key.startsWith('summary:last:')) {
        const assessmentId = currentSort.key.replace('summary:last:', '');
        return row.summaryByAssessment[assessmentId]?.lastPercentage ?? null;
      }

      if (currentSort.key.startsWith('summary:executions:')) {
        const assessmentId = currentSort.key.replace('summary:executions:', '');
        return row.summaryByAssessment[assessmentId]?.executions ?? 0;
      }

      if (currentSort.key.startsWith('detail:')) {
        const detailKey = currentSort.key.replace('detail:', '');
        return row.detailByAssessmentIndicator[detailKey] ?? null;
      }

      return row.userName;
    };

    rows.sort((left, right) => {
      const primary = compareValues(getSortValue(left), getSortValue(right), currentSort.direction);
      if (primary !== 0) return primary;
      return compareValues(left.userName, right.userName, 'asc');
    });

    return rows;
  }, [detailData.rows, sortConfig]);

  const virtualizedBody = useMemo(() => {
    const rows = sortedRows;
    const total = rows.length;
    const canVirtualize = total > TABLE_VIRTUALIZATION_THRESHOLD;

    if (!canVirtualize) {
      return {
        rows,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        isVirtualized: false,
        start: 0,
        end: total
      };
    }

    const visibleCount = Math.ceil(tableViewportHeight / TABLE_ROW_HEIGHT);
    const start = Math.max(0, Math.floor(tableScrollTop / TABLE_ROW_HEIGHT) - TABLE_OVERSCAN);
    const end = Math.min(total, start + visibleCount + TABLE_OVERSCAN * 2);
    const slicedRows = rows.slice(start, end);

    return {
      rows: slicedRows,
      topSpacerHeight: start * TABLE_ROW_HEIGHT,
      bottomSpacerHeight: Math.max(0, (total - end) * TABLE_ROW_HEIGHT),
      isVirtualized: true,
      start,
      end
    };
  }, [sortedRows, tableViewportHeight, tableScrollTop]);

  const toggleSort = (key) => {
    setTableScrollTop(0);
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }

    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }

      return {
        key,
        direction: 'asc'
      };
    });
  };

  const getSortDirection = (key) => (sortConfig.key === key ? sortConfig.direction : null);

  const getAriaSort = (key) => {
    const direction = getSortDirection(key);
    if (direction === 'asc') return 'ascending';
    if (direction === 'desc') return 'descending';
    return 'none';
  };

  const getColumnToneClasses = (key, { sticky = false } = {}) => {
    const isActive = sortConfig.key === key;

    if (!isActive) {
      return sticky ? 'bg-white' : '';
    }

    return sticky
      ? 'bg-indigo-50/95 shadow-[inset_0_-1px_0_0_rgba(99,102,241,0.18)]'
      : 'bg-indigo-50/60';
  };

  const renderSortableHeader = (label, key, minWidthClass) => {
    const direction = getSortDirection(key);
    const SortIcon = direction === 'desc' ? ArrowDown : ArrowUp;

    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`w-full inline-flex items-center justify-between gap-2 text-left font-semibold ${minWidthClass || ''}`}
        aria-label={`Ordenar por ${label}`}
      >
        <span className={direction ? 'text-[#1E1B4B]' : ''}>{label}</span>
        <span className={`inline-flex items-center justify-center rounded-full transition ${direction ? 'text-[#4F46E5]' : 'text-gray-300'}`}>
          <SortIcon className="w-3.5 h-3.5" />
        </span>
      </button>
    );
  };

  const toggleAssessment = (assessmentId) => {
    setAssessmentMode('specific');
    setSelectedAssessmentIds((prev) => {
      if (prev.includes(assessmentId)) return prev.filter((id) => id !== assessmentId);
      return [...prev, assessmentId];
    });
  };

  const toggleUser = (userId) => {
    setUserMode('specific');
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      return [...prev, userId];
    });
  };

  useEffect(() => {
    if (assessmentMode === 'specific' && selectedAssessmentIds.length === 0) {
      setAssessmentMode('all');
    }
  }, [assessmentMode, selectedAssessmentIds]);

  useEffect(() => {
    if (userMode === 'specific' && selectedUserIds.length === 0) {
      setUserMode('all');
    }
  }, [userMode, selectedUserIds]);

  const renderAppliedFiltersSection = () => (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-3 sm:p-4 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Filtros aplicados</span>

        {!isDefaultAssessmentFilter && (
          <button
            type="button"
            onClick={resetAssessmentFilter}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-indigo-700 transition"
            aria-label="Remover filtro de assessments"
          >
            {`Assessments: ${selectedAssessmentIds.length}`}
            <X aria-hidden="true" className="w-3 h-3" />
          </button>
        )}

        {!isDefaultUserFilter && (
          <button
            type="button"
            onClick={resetUserFilter}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-indigo-700 transition"
            aria-label="Remover filtro de usuários"
          >
            {`Usuários: ${selectedUserIds.length || 'Todos'}${searchInput.trim() ? ` (${searchInput.trim()})` : ''}`}
            <X aria-hidden="true" className="w-3 h-3" />
          </button>
        )}

        {!isDefaultPeriodFilter && (
          <button
            type="button"
            onClick={resetPeriodFilter}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-indigo-700 transition"
            aria-label="Remover filtro de período"
          >
            {`Período: ${formatDateBr(dateStart)} até ${formatDateBr(dateEnd)}`}
            <X aria-hidden="true" className="w-3 h-3" />
          </button>
        )}

        {(!isDefaultAssessmentFilter || !isDefaultUserFilter || !isDefaultPeriodFilter) && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-white text-indigo-700 text-xs font-semibold px-3 py-1.5 hover:bg-indigo-100 transition"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {isDefaultAssessmentFilter && isDefaultUserFilter && isDefaultPeriodFilter && (
        <p className="text-xs text-indigo-700/80 mt-2">Nenhum filtro customizado aplicado.</p>
      )}
    </div>
  );

  const renderTableSection = (fullscreen = false) => (
    <div className={`bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 ${fullscreen ? 'h-full flex flex-col' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-[#1E1B4B]">Tabela de usuários e resultados</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border-2 border-[#6366F1] p-1 bg-[#EEF2FF] w-fit shadow-sm">
            <button
              type="button"
              onClick={() => setTableMode('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tableMode === 'summary' ? 'bg-[#4F46E5] text-white shadow-sm' : 'text-[#3730A3] hover:bg-[#E0E7FF]'}`}
            >
              Resumido
            </button>
            <button
              type="button"
              onClick={() => setTableMode('detailed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tableMode === 'detailed' ? 'bg-[#4F46E5] text-white shadow-sm' : 'text-[#3730A3] hover:bg-[#E0E7FF]'}`}
            >
              Detalhado
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen((current) => !current)}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white text-indigo-700 text-xs font-semibold px-3 py-1.5 hover:bg-indigo-50 transition"
            aria-label={fullscreen ? 'Sair da tela cheia' : 'Ver em tela cheia'}
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          </button>
        </div>
      </div>

      {virtualizedBody.isVirtualized && (
        <p className="text-xs text-gray-500 mb-3">
          Virtualização ativa: exibindo linhas {virtualizedBody.start + 1} a {virtualizedBody.end} de {sortedRows.length}.
        </p>
      )}

      {loadingDetail ? (
        <div className="py-10 text-center text-sm text-gray-500 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando resultados...
        </div>
      ) : detailData.rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm font-semibold text-[#1E1B4B]">Nenhum dado encontrado para este recorte.</p>
          <p className="text-xs text-gray-500 mt-1">Ajuste período, assessments ou usuários para visualizar resultados.</p>
        </div>
      ) : (
        <div
          ref={tableScrollRef}
          onScroll={onTableScroll}
          className={`overflow-auto scroll-smooth ${fullscreen ? 'flex-1 min-h-0' : 'max-h-[68vh]'}`}
          style={{ overscrollBehavior: 'contain' }}
        >
          <table className="min-w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th rowSpan={2} className="sticky top-0 left-0 z-40 border-b border-gray-200 text-left px-3 py-2 min-w-[64px] bg-white align-middle">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">#</span>
                </th>
                <th rowSpan={2} aria-sort={getAriaSort('userName')} className={`sticky top-0 z-30 border-b border-gray-200 text-left px-3 py-2 min-w-[220px] align-middle ${getColumnToneClasses('userName', { sticky: true })}`} style={{ left: 64 }}>
                  {renderSortableHeader('Usuário', 'userName')}
                </th>
                <th rowSpan={2} aria-sort={getAriaSort('userRole')} className={`sticky top-0 z-20 border-b border-gray-200 text-left px-3 py-2 min-w-[100px] align-middle ${getColumnToneClasses('userRole', { sticky: true })}`}>
                  {renderSortableHeader('Perfil', 'userRole')}
                </th>

                {tableMode === 'summary' && selectedAssessments.map((assessment) => (
                  <th
                    key={`group-summary-${assessment.id}`}
                    colSpan={2}
                    className="sticky top-0 z-20 border-b border-gray-200 border-l-2 border-r-2 border-indigo-200 bg-indigo-50/70 text-left px-3 py-2"
                  >
                    <span className="text-xs font-bold tracking-wide text-indigo-900 uppercase">{assessment.name}</span>
                  </th>
                ))}

                {tableMode === 'detailed' && detailedAssessmentGroups.map((group) => (
                  <th
                    key={`group-detail-${group.assessmentId}`}
                    colSpan={group.columns.length}
                    className="sticky top-0 z-20 border-b border-gray-200 border-l-2 border-r-2 border-indigo-200 bg-indigo-50/70 text-left px-3 py-2"
                  >
                    <span className="text-xs font-bold tracking-wide text-indigo-900 uppercase">{group.assessmentName}</span>
                  </th>
                ))}
              </tr>
              <tr>
                {tableMode === 'summary' && selectedAssessments.map((assessment) => (
                  <React.Fragment key={`summary-sub-${assessment.id}`}>
                    <th
                      aria-sort={getAriaSort(`summary:last:${assessment.id}`)}
                      className={`sticky top-[41px] z-10 border-b border-gray-200 border-l-2 border-l-indigo-200 text-left px-3 py-2 min-w-[160px] ${getColumnToneClasses(`summary:last:${assessment.id}`, { sticky: true })}`}
                    >
                      {renderSortableHeader('Última (%)', `summary:last:${assessment.id}`)}
                    </th>
                    <th
                      aria-sort={getAriaSort(`summary:executions:${assessment.id}`)}
                      className={`sticky top-[41px] z-10 border-b border-gray-200 border-r-2 border-r-indigo-200 text-left px-3 py-2 min-w-[140px] ${getColumnToneClasses(`summary:executions:${assessment.id}`, { sticky: true })}`}
                    >
                      {renderSortableHeader('Tentativas', `summary:executions:${assessment.id}`)}
                    </th>
                  </React.Fragment>
                ))}

                {tableMode === 'detailed' && detailData.detailedColumns.map((column) => {
                  const boundary = detailedColumnBoundaryMap[column.key] || { isStart: false, isEnd: false };
                  return (
                    <th
                      aria-sort={getAriaSort(`detail:${column.key}`)}
                      key={column.key}
                      className={`sticky top-[41px] z-10 border-b border-gray-200 text-left px-3 py-2 min-w-[180px] ${boundary.isStart ? 'border-l-2 border-l-indigo-200' : ''} ${boundary.isEnd ? 'border-r-2 border-r-indigo-200' : ''} ${getColumnToneClasses(`detail:${column.key}`, { sticky: true })}`}
                    >
                      {renderSortableHeader(column.indicatorName, `detail:${column.key}`)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {virtualizedBody.isVirtualized && virtualizedBody.topSpacerHeight > 0 && (
                <tr aria-hidden="true">
                  <td
                    colSpan={3 + dynamicColumnCount}
                    style={{ height: `${virtualizedBody.topSpacerHeight}px`, padding: 0, border: 0 }}
                  />
                </tr>
              )}

              {virtualizedBody.rows.map((row, rowIndex) => (
                <tr key={row.userId}>
                  <td className="sticky left-0 z-20 border-b border-gray-100 px-3 py-2 text-gray-500 bg-white font-semibold">{virtualizedBody.start + rowIndex + 1}</td>
                  <td className={`sticky z-10 border-b border-gray-100 px-3 py-2 font-medium text-[#1E1B4B] ${getColumnToneClasses('userName', { sticky: true })}`} style={{ left: 64 }}>{row.userName}</td>
                  <td className={`border-b border-gray-100 px-3 py-2 text-gray-600 ${getColumnToneClasses('userRole')}`}>{row.userRole}</td>

                  {tableMode === 'summary' && selectedAssessments.map((assessment) => {
                    const summary = row.summaryByAssessment[assessment.id] || {};
                    return (
                      <React.Fragment key={`${row.userId}-${assessment.id}`}>
                        <td className={`border-b border-gray-100 border-l-2 border-l-indigo-200 px-3 py-2 text-gray-700 ${getColumnToneClasses(`summary:last:${assessment.id}`)}`}>
                          {summary.lastPercentage === null ? '-' : formatPct(summary.lastPercentage)}
                        </td>
                        <td className={`border-b border-gray-100 border-r-2 border-r-indigo-200 px-3 py-2 text-gray-700 ${getColumnToneClasses(`summary:executions:${assessment.id}`)}`}>{summary.executions || 0}</td>
                      </React.Fragment>
                    );
                  })}

                  {tableMode === 'detailed' && detailData.detailedColumns.map((column) => {
                    const boundary = detailedColumnBoundaryMap[column.key] || { isStart: false, isEnd: false };
                    return (
                      <td
                        key={`${row.userId}-${column.key}`}
                        className={`border-b border-gray-100 px-3 py-2 text-gray-700 ${boundary.isStart ? 'border-l-2 border-l-indigo-200' : ''} ${boundary.isEnd ? 'border-r-2 border-r-indigo-200' : ''} ${getColumnToneClasses(`detail:${column.key}`)}`}
                      >
                        {row.detailByAssessmentIndicator[column.key] == null ? '-' : formatPct(row.detailByAssessmentIndicator[column.key])}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {virtualizedBody.isVirtualized && virtualizedBody.bottomSpacerHeight > 0 && (
                <tr aria-hidden="true">
                  <td
                    colSpan={3 + dynamicColumnCount}
                    style={{ height: `${virtualizedBody.bottomSpacerHeight}px`, padding: 0, border: 0 }}
                  />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (roleLoading) {
    return <ManagementSkeleton />;
  }

  if (role !== 'admin') {
    return (
      <div className="p-12 text-center text-red-600">
        Acesso negado. Somente admins podem acessar esta página.
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden"
      role="main"
    >
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl" aria-hidden="true"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl" aria-hidden="true"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full">
          
          <h1 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight`}>
            Painel de resultados
          </h1>
          
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 pb-8">
          <aside className="lg:col-span-4 bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 h-fit lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-[#4F46E5]" />
              <h2 className="text-lg sm:text-xl font-bold text-[#1E1B4B]">Seleção de escopo</h2>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 sm:p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarRange className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-sm font-semibold text-[#1E1B4B]">Período</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-xs text-gray-500">
                  Início
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Fim
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 sm:p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="text-sm font-semibold text-[#1E1B4B]">Assessments</h3>
                </div>
                <span className="text-xs text-gray-500">
                  {assessmentMode === 'all' ? 'Todos' : `${selectedAssessmentIds.length} selecionado(s)`}
                </span>
              </div>

              <button
                type="button"
                onClick={resetAssessmentFilter}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-left mb-2 transition ${assessmentMode === 'all' ? 'border-[#4F46E5] bg-indigo-50 text-[#1E1B4B]' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
              >
                <span className="inline-flex items-center gap-2">
                  {assessmentMode === 'all' && <Check className="w-4 h-4 text-[#4F46E5]" />}
                  Todos os assessments
                </span>
              </button>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {assessments.map((assessment) => {
                  const checked = selectedAssessmentIds.includes(assessment.id) && assessmentMode !== 'all';
                  return (
                    <button
                      key={assessment.id}
                      type="button"
                      onClick={() => toggleAssessment(assessment.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${checked ? 'border-[#4F46E5] bg-indigo-50 text-[#1E1B4B]' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{assessment.name}</span>
                        {checked && <Check className="w-4 h-4 text-[#4F46E5] shrink-0" />}
                      </div>
                    </button>
                  );
                })}

                {!loadingMeta && assessments.length === 0 && (
                  <p className="text-xs text-gray-500">Nenhum assessment encontrado.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="text-sm font-semibold text-[#1E1B4B]">Usuários</h3>
                </div>
                <span className="text-xs text-gray-500">
                  {userMode === 'all' ? 'Todos' : `${selectedUserIds.length} selecionado(s)`}
                </span>
              </div>

              <div className="relative mb-2">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar usuário"
                  className="w-full rounded-lg border border-gray-300 pl-8 pr-2 py-2 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={resetUserFilter}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-left mb-2 transition ${userMode === 'all' ? 'border-[#4F46E5] bg-indigo-50 text-[#1E1B4B]' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
              >
                <span className="inline-flex items-center gap-2">
                  {userMode === 'all' && <Check className="w-4 h-4 text-[#4F46E5]" />}
                  Todos os usuários
                </span>
              </button>

              <div
                ref={usersListRef}
                onScroll={onUsersScroll}
                className="space-y-2 max-h-72 overflow-y-auto pr-1"
              >
                {allUsersLoaded.map((profile) => {
                  const checked = selectedUserIds.includes(profile.id) && userMode !== 'all';
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => toggleUser(profile.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${checked ? 'border-[#4F46E5] bg-indigo-50 text-[#1E1B4B]' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{profile.display_name || 'Usuário sem nome'}</span>
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">{profile.role || 'user'}</span>
                      </div>
                    </button>
                  );
                })}

                {loadingUsers && (
                  <div className="text-xs text-gray-500 inline-flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Carregando usuários...
                  </div>
                )}

                {!loadingUsers && allUsersLoaded.length === 0 && (
                  <p className="text-xs text-gray-500">Nenhum usuário encontrado.</p>
                )}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-8 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6">
              {renderAppliedFiltersSection()}

              {metaError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
                  {metaError}
                </div>
              )}

              {detailError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
                  {detailError}
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Usuários no recorte</p>
                  <p className="text-xl font-bold text-[#1E1B4B]">{detailData.kpis.usersCount}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Assessments no recorte</p>
                  <p className="text-xl font-bold text-[#1E1B4B]">{detailData.kpis.assessmentsCount}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Tentativas</p>
                  <p className="text-xl font-bold text-[#1E1B4B]">{detailData.kpis.executionsCount}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Média geral</p>
                  <p className="text-xl font-bold text-[#1E1B4B]">{formatPct(detailData.kpis.avgScore)}</p>
                </div>
              </div>

            </div>

            {!isFullscreen && renderTableSection(false)}
          </section>
        </div>
      </main>

      {isFullscreen && (
        <div className="fixed inset-0 z-[110] bg-[#0F172A]/55 backdrop-blur-sm p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Tabela de resultados em tela cheia">
          <div className="relative w-full h-full bg-[#F8FAFC] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="absolute top-3 right-3 z-20 inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white text-indigo-700 p-1.5 hover:bg-indigo-50 transition"
              aria-label="Fechar tela cheia"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 py-4 pt-12 flex flex-col gap-4">
              <div className="w-full max-w-4xl">
                {renderAppliedFiltersSection()}
              </div>
              <div className="flex-1 min-h-0">
                {renderTableSection(true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Panel;
