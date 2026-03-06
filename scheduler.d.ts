import type moment from 'moment'

export interface SchedulerHeader {
  group: moment.unitOfTime.Base
  format?: string
  step?: number
}

export interface SchedulerZoomScale {
  scale: moment.unitOfTime.Base
  step: number
}

export type SchedulerType = 'task' | 'milestone'

export interface SchedulerResource {
  id: string
  label: string
  type: SchedulerType
}

export interface SchedulerTask<T> {
  id: string
  resourceId: string
  start: moment.Moment
  end: moment.Moment
  label: string
  type: SchedulerType
  data?: T
  headerColor?: string
  backgroundColor?: string
  borderColor?: string
  keys?: (string | number)[]
}

export interface GroupedSchedulerTask<T> {
  task: SchedulerTask<T>
  left: number
  width: number
}
