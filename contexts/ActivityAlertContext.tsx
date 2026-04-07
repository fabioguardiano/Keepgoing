import React, { createContext, useContext, useMemo } from 'react';
import { CRMActivity, ActivityAlertStatus, getActivityAlertStatus } from '../types';

interface ActivityAlertContextValue {
  /** Atividades agrupadas por referenceId (sale.id ou work_order.id) */
  activitiesByRef: Record<string, CRMActivity[]>;
  /** Status de alerta computado por referenceId */
  alertByRef: Record<string, ActivityAlertStatus>;
  createCRMActivity: (input: Omit<CRMActivity, 'id' | 'companyId' | 'createdAt'>) => Promise<void>;
  completeCRMActivity: (id: string) => Promise<void>;
  deleteCRMActivity: (id: string) => Promise<void>;
}

const ActivityAlertContext = createContext<ActivityAlertContextValue>({
  activitiesByRef: {},
  alertByRef: {},
  createCRMActivity: async () => {},
  completeCRMActivity: async () => {},
  deleteCRMActivity: async () => {},
});

export const useActivityAlert = () => useContext(ActivityAlertContext);

interface Props {
  crmActivities: CRMActivity[];
  createCRMActivity: (input: Omit<CRMActivity, 'id' | 'companyId' | 'createdAt'>) => Promise<void>;
  completeCRMActivity: (id: string) => Promise<void>;
  deleteCRMActivity: (id: string) => Promise<void>;
  children: React.ReactNode;
}

export const ActivityAlertProvider: React.FC<Props> = ({
  crmActivities,
  createCRMActivity,
  completeCRMActivity,
  deleteCRMActivity,
  children,
}) => {
  const activitiesByRef = useMemo(() => {
    const map: Record<string, CRMActivity[]> = {};
    for (const a of crmActivities) {
      if (!map[a.referenceId]) map[a.referenceId] = [];
      map[a.referenceId].push(a);
    }
    return map;
  }, [crmActivities]);

  const alertByRef = useMemo(() => {
    const result: Record<string, ActivityAlertStatus> = {};
    for (const [refId, acts] of Object.entries(activitiesByRef)) {
      result[refId] = getActivityAlertStatus(acts);
    }
    return result;
  }, [activitiesByRef]);

  return (
    <ActivityAlertContext.Provider
      value={{ activitiesByRef, alertByRef, createCRMActivity, completeCRMActivity, deleteCRMActivity }}
    >
      {children}
    </ActivityAlertContext.Provider>
  );
};
