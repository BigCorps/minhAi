// ============================================================
// ThermalPrinterService.ts
// Caminho: eAi/lib/thermal-printer-service.ts
//
// Serviço para comunicação com impressoras térmicas via:
// - WebUSB (USB direto)
// - WebBluetooth (Bluetooth)
// - Rede (via PrintNode ou API própria)
//
// Suporta comandos ESC/POS (padrão universal de PDV)
// ============================================================

import EscPosEncoder from 'esc-pos-encoder';

export type PrinterConnectionType = 'usb' | 'bluetooth' | 'network' | 'printnode';

export interface ThermalPrinter {
  id: string;
  name: string;
  type: PrinterConnectionType;
  device?: USBDevice | BluetoothDevice;
  connected: boolean;
}

export class ThermalPrinterService {
  private connectedPrinter: ThermalPrinter | null = null;
  private encoder = new EscPosEncoder();

  // ── Detectar impressoras disponíveis ─────────────────────
  async detectPrinters(): Promise<ThermalPrinter[]> {
    const printers: ThermalPrinter[] = [];

    // 1. WebUSB (impressoras USB)
    if ('usb' in navigator) {
      try {
        const devices = await (navigator as any).usb.getDevices();
        devices.forEach((device: USBDevice) => {
          // Detectar VendorID comum de impressoras térmicas
          const thermalVendorIds = [
            0x0483, // STMicroelectronics (comum em térmicas chinesas)
            0x04b8, // Epson
            0x1504, // Citizen
            0x0dd4, // Custom
            0x154f, // Bematech
            0x0fe6, // ICS Advent
          ];

          if (thermalVendorIds.includes(device.vendorId)) {
            printers.push({
              id: `usb-${device.vendorId}-${device.productId}`,
              name: device.productName || `Impressora USB ${device.vendorId}`,
              type: 'usb',
              device,
              connected: false,
            });
          }
        });
      } catch (error) {
        console.warn('WebUSB não disponível:', error);
      }
    }

    // 2. WebBluetooth (impressoras Bluetooth)
    if ('bluetooth' in navigator) {
      try {
        // Buscar impressoras Bluetooth próximas
        const btDevice = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Serviço ESC/POS
          ],
          optionalServices: ['battery_service'],
        });

        if (btDevice) {
          printers.push({
            id: `bt-${btDevice.id}`,
            name: btDevice.name || 'Impressora Bluetooth',
            type: 'bluetooth',
            device: btDevice,
            connected: false,
          });
        }
      } catch (error) {
        console.warn('WebBluetooth não disponível:', error);
      }
    }

    return printers;
  }

  // ── Solicitar permissão e conectar (USB) ──────────────────
  async requestUSBPrinter(): Promise<ThermalPrinter | null> {
    if (!('usb' in navigator)) {
      throw new Error('WebUSB não suportado neste navegador');
    }

    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x0483 }, // STMicroelectronics
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x1504 }, // Citizen
          { vendorId: 0x0dd4 }, // Custom
          { vendorId: 0x154f }, // Bematech
          { vendorId: 0x0fe6 }, // ICS Advent
        ],
      });

      const printer: ThermalPrinter = {
        id: `usb-${device.vendorId}-${device.productId}`,
        name: device.productName || `Impressora USB ${device.vendorId}`,
        type: 'usb',
        device,
        connected: false,
      };

      await this.connectUSB(printer);
      return printer;
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return null; // Usuário cancelou
      }
      throw error;
    }
  }

  // ── Conectar impressora USB ───────────────────────────────
  private async connectUSB(printer: ThermalPrinter): Promise<void> {
    const device = printer.device as USBDevice;

    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);

    printer.connected = true;
    this.connectedPrinter = printer;
  }

  // ── Conectar impressora Bluetooth ─────────────────────────
  async connectBluetooth(printer: ThermalPrinter): Promise<void> {
    const device = printer.device as BluetoothDevice;

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Falha ao conectar Bluetooth');

    printer.connected = true;
    this.connectedPrinter = printer;
  }

  // ── Imprimir texto simples ────────────────────────────────
  async printText(text: string, options?: {
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    size?: 'normal' | 'double-height' | 'double-width' | 'double';
    cut?: boolean;
  }): Promise<void> {
    if (!this.connectedPrinter?.connected) {
      throw new Error('Nenhuma impressora conectada');
    }

    const encoder = new EscPosEncoder();
    let encoded = encoder.initialize();

    // Alinhamento
    if (options?.align === 'center') encoded = encoded.align('center');
    if (options?.align === 'right') encoded = encoded.align('right');

    // Negrito
    if (options?.bold) encoded = encoded.bold(true);

    // Tamanho
    if (options?.size === 'double') {
      encoded = encoded.width(2).height(2);
    } else if (options?.size === 'double-height') {
      encoded = encoded.height(2);
    } else if (options?.size === 'double-width') {
      encoded = encoded.width(2);
    }

    // Texto
    encoded = encoded.text(text).newline();

    // Cortar papel
    if (options?.cut) {
      encoded = encoded.cut('partial');
    }

    const data = encoded.encode();
    await this.sendToPrinter(data);
  }

  // ── Imprimir recibo formatado ─────────────────────────────
  async printReceipt(data: {
    title: string;
    items: Array<{ label: string; value: string }>;
    total?: string;
    footer?: string;
  }): Promise<void> {
    const encoder = new EscPosEncoder();
    let encoded = encoder.initialize();

    // Cabeçalho
    encoded = encoded
      .align('center')
      .bold(true)
      .width(2)
      .height(2)
      .text(data.title)
      .newline()
      .bold(false)
      .width(1)
      .height(1)
      .text('─'.repeat(32))
      .newline()
      .align('left');

    // Itens
    data.items.forEach(item => {
      const label = item.label.padEnd(20, ' ');
      const value = item.value.padStart(12, ' ');
      encoded = encoded.text(label + value).newline();
    });

    // Total
    if (data.total) {
      encoded = encoded
        .text('─'.repeat(32))
        .newline()
        .bold(true)
        .text('TOTAL'.padEnd(20, ' ') + data.total.padStart(12, ' '))
        .newline()
        .bold(false);
    }

    // Rodapé
    if (data.footer) {
      encoded = encoded
        .text('─'.repeat(32))
        .newline()
        .align('center')
        .text(data.footer)
        .newline();
    }

    // Cortar
    encoded = encoded.newline(3).cut('partial');

    const bytes = encoded.encode();
    await this.sendToPrinter(bytes);
  }

  // ── Imprimir QR Code ──────────────────────────────────────
  async printQRCode(content: string, size: number = 6): Promise<void> {
    const encoder = new EscPosEncoder();
    const encoded = encoder
      .initialize()
      .align('center')
      .qrcode(content, 1, size, 'h')
      .newline(2)
      .cut('partial')
      .encode();

    await this.sendToPrinter(encoded);
  }

  // ── Enviar dados para impressora ──────────────────────────
  private async sendToPrinter(data: Uint8Array): Promise<void> {
    if (!this.connectedPrinter?.connected) {
      throw new Error('Impressora não conectada');
    }

    const printer = this.connectedPrinter;

    if (printer.type === 'usb') {
      const device = printer.device as USBDevice;
      // Endpoint OUT típico de impressoras térmicas
      await device.transferOut(1, data);
    } else if (printer.type === 'bluetooth') {
      const device = printer.device as BluetoothDevice;
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service?.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      await characteristic?.writeValue(data);
    }
  }

  // ── Desconectar ───────────────────────────────────────────
  async disconnect(): Promise<void> {
    if (!this.connectedPrinter) return;

    const printer = this.connectedPrinter;

    if (printer.type === 'usb') {
      const device = printer.device as USBDevice;
      await device.close();
    } else if (printer.type === 'bluetooth') {
      const device = printer.device as BluetoothDevice;
      device.gatt?.disconnect();
    }

    this.connectedPrinter = null;
  }

  // ── Status ────────────────────────────────────────────────
  isConnected(): boolean {
    return this.connectedPrinter?.connected || false;
  }

  getConnectedPrinter(): ThermalPrinter | null {
    return this.connectedPrinter;
  }
}

// ── Instância singleton ───────────────────────────────────
export const thermalPrinterService = new ThermalPrinterService();