import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, Validators } from '@angular/forms';
import { getInitials } from '../../../../shared/utils/get-initials';
import { DEVICE_CATALOG, STYLE_PRESETS } from '../onboarding-presets';
import type {
  DeviceBrand,
  DeviceOption,
  OnboardingPreferences,
  OnboardingStep,
  StylePreset,
  StyleKey,
} from '../models/onboarding.model';

const isValidCreatorName = (value: string): boolean => {
  const length = value.trim().length;
  return length >= 2 && length <= 40;
};

@Injectable()
export class OnboardingState {
  private readonly destroyRef = inject(DestroyRef);
  private readonly nameEdited = signal(false);

  readonly step = signal<OnboardingStep>(1);
  readonly brand = signal<DeviceBrand>('apple');
  readonly deviceModel = signal<string | null>(null);
  readonly styleKey = signal<StyleKey | null>(null);
  readonly creatorNameControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [
      Validators.required,
      (control) => (isValidCreatorName(String(control.value)) ? null : { nameLength: true }),
    ],
  });
  readonly creatorName = signal('');

  readonly nameValid = computed(() => isValidCreatorName(this.creatorName()));
  readonly canAdvance = computed(() => this.step() !== 1 || this.nameValid());
  readonly isLastStep = computed(() => this.step() === 3);
  readonly initials = computed(() => getInitials(this.creatorName()));
  readonly devicesForBrand = computed<readonly DeviceOption[]>(
    () => DEVICE_CATALOG[this.brand()],
  );
  readonly activePreset = computed<StylePreset>(
    () => STYLE_PRESETS.find((preset) => preset.key === this.styleKey()) ?? STYLE_PRESETS[4],
  );
  readonly draft = computed<OnboardingPreferences>(() => {
    const selectedDevice = this.deviceModel();
    return {
      displayName: this.creatorName().trim(),
      deviceBrand: selectedDevice ? this.brand() : null,
      deviceModel: selectedDevice,
      styleKey: this.styleKey(),
    };
  });

  constructor() {
    this.creatorNameControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.nameEdited.set(true);
        this.creatorName.set(value);
      });
  }

  goTo(step: OnboardingStep): void {
    if (step > this.step() && !this.nameValid()) {
      this.creatorNameControl.markAsTouched();
      return;
    }
    this.step.set(step);
  }

  next(): void {
    if (!this.canAdvance()) {
      this.creatorNameControl.markAsTouched();
      return;
    }
    if (this.isLastStep()) return;
    this.step.update((step) => (step + 1) as OnboardingStep);
  }

  prev(): void {
    if (this.step() > 1) this.step.update((step) => (step - 1) as OnboardingStep);
  }

  setBrand(brand: DeviceBrand): void {
    if (
      this.deviceModel() &&
      !DEVICE_CATALOG[brand].some((device) => device.id === this.deviceModel())
    ) {
      this.deviceModel.set(null);
    }
    this.brand.set(brand);
  }

  selectDevice(id: string): void {
    if (this.devicesForBrand().some((device) => device.id === id)) {
      this.deviceModel.set(id);
    }
  }

  selectStyle(key: string): void {
    const preset = STYLE_PRESETS.find((item) => item.key === key);
    if (preset) this.styleKey.set(preset.key);
  }

  prefillName(name: string): void {
    if (this.nameEdited() || this.creatorNameControl.value.trim()) return;
    this.creatorNameControl.setValue(name);
  }
}
