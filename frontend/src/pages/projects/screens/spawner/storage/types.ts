export enum MountPathFormat {
  STANDARD = 'Standard',
  CUSTOM = 'Custom',
}

export enum PvcModelAnnotation {
  MODEL_NAME = 'dashboard.opendatahub.io/model-name',
  MODEL_PATH = 'dashboard.opendatahub.io/model-path',
}

export enum ModelAnnotation {
  STOPPED_ANNOTATION = 'serving.kserve.io/stop',
}
