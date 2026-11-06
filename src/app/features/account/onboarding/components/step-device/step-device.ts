import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { DeviceBrand, DeviceOption } from '../../models/onboarding.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-step-device',
  templateUrl: './step-device.html',
  styleUrl: './step-device.scss',
})
export class StepDevice {
  readonly brand = input.required<DeviceBrand>();
  readonly devices = input.required<readonly DeviceOption[]>();
  readonly selectedDevice = input<string | null>(null);
  readonly busy = input(false);
  readonly brandSelected = output<DeviceBrand>();
  readonly deviceSelected = output<string>();

  protected selectBrand(brand: DeviceBrand): void {
    this.brandSelected.emit(brand);
  }

  protected selectDevice(id: string): void {
    this.deviceSelected.emit(id);
  }
}
