import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnInit,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { OnboardingFlow } from './services/onboarding-flow';
import { NotificationManager } from '../../../shared/ui/notification/notification.manager';
import { OnboardingState } from './services/onboarding-state';
import { OnboardingHero } from './components/onboarding-hero/onboarding-hero';
import { OnboardingStepper } from './components/onboarding-stepper/onboarding-stepper';
import { StepCreatorName } from './components/step-creator-name/step-creator-name';
import { StepDevice } from './components/step-device/step-device';
import { StepStyle } from './components/step-style/step-style';
import { OnboardingPreview } from './components/onboarding-preview/onboarding-preview';
import { SkipDialog } from './components/skip-dialog/skip-dialog';
import { DEVICE_CATALOG, STYLE_PRESETS } from './onboarding-presets';
import type { OnboardingStep } from './models/onboarding.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OnboardingHero,
    OnboardingStepper,
    StepCreatorName,
    StepDevice,
    StepStyle,
    OnboardingPreview,
    SkipDialog,
  ],
  selector: 'app-onboarding',
  providers: [OnboardingState, OnboardingFlow],
  styleUrl: './onboarding.scss',
  templateUrl: './onboarding.html',
})
export class Onboarding implements OnInit {
  protected readonly flow = inject(OnboardingFlow);
  protected readonly state = inject(OnboardingState);
  private readonly injector = inject(Injector);
  private readonly wizardSection = viewChild.required<ElementRef<HTMLElement>>('wizardSection');
  private readonly stepPanel = viewChild.required<ElementRef<HTMLElement>>('stepPanel');
  private readonly skipDialog = viewChild.required(SkipDialog);
  readonly returnUrl = input<string>();
  /** `?flow=signup` when the user arrives straight from creating an account. */
  readonly flowParam = input<string>(undefined, { alias: 'flow' });
  private readonly notifications = inject(NotificationManager);
  protected readonly stylePresets = STYLE_PRESETS;
  protected readonly deviceLabel = computed(() => {
    const selectedId = this.state.deviceModel();
    return (
      DEVICE_CATALOG[this.state.brand()].find((device) => device.id === selectedId)?.name ??
      'Chưa chọn dòng máy'
    );
  });
  private previousFocusedStep: OnboardingStep | null = null;
  private readonly focusStepHeading = effect(() => {
    const step = this.state.step();
    if (this.previousFocusedStep === null) {
      this.previousFocusedStep = step;
      return;
    }
    this.previousFocusedStep = step;
    afterNextRender(
      () => this.stepPanel().nativeElement.querySelector<HTMLElement>('[data-step-heading]')?.focus(),
      { injector: this.injector },
    );
  });

  ngOnInit(): void {
    this.flow.start();
    if (this.flowParam() === 'signup') this.welcomeNewUser();
  }

  /** Sign-up success toast, shown once per tab session (a reload of the wizard does not repeat it). */
  private welcomeNewUser(): void {
    const key = 'caseye_signup_welcomed';
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Storage unavailable: show it anyway.
    }
    this.notifications.show({
      variant: 'success',
      title: 'Đăng ký thành công!',
      message: "Chào mừng bạn đến CasEYE's. Thiết lập nhanh hồ sơ để nhận gợi ý mẫu ốp hợp gu nhé.",
      duration: 7000,
    });
  }

  protected scrollToWizard(): void {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    this.wizardSection().nativeElement.scrollIntoView({ behavior, block: 'start' });
  }

  protected selectStep(step: OnboardingStep): void {
    this.state.goTo(step);
  }

  protected next(): void {
    if (this.state.isLastStep()) {
      void this.flow.complete(this.returnUrl());
      return;
    }
    this.state.next();
  }

  protected skip(): void {
    void this.flow.skip(this.returnUrl());
  }

  protected openSkipDialog(): void {
    if (!this.flow.busy()) this.skipDialog().open();
  }
}
