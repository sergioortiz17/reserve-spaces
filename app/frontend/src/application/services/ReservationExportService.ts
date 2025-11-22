/**
 * Service for exporting and importing reservations
 * Handles CSV/JSON export/import logic
 */
import { services } from '../../infrastructure/di/container';
import type { Reservation } from '../../types';

export class ReservationExportService {
  /**
   * Normalize time string to HH:MM format
   */
  private normalizeTime(time: string): string {
    if (!time) return '';
    // Remove seconds if present (HH:MM:SS -> HH:MM)
    return time.substring(0, 5);
  }

  /**
   * Export reservations to CSV
   */
  async exportToCSV(reservations: Reservation[]): Promise<string> {
    if (reservations.length === 0) {
      throw new Error('No reservations to export');
    }

    const headers = [
      'Space Name',
      'Space Type',
      'Space ID',
      'User ID',
      'User Name',
      'Date',
      'Start Time',
      'End Time',
      'Notes',
    ];

    const rows = reservations.map(r => [
      r.space?.name || r.space_name || '',
      r.space?.type || r.space_type || '',
      r.space_id,
      r.user_id,
      r.user_name || '',
      r.date.split('T')[0],
      this.normalizeTime(r.start_time || ''),
      this.normalizeTime(r.end_time || ''),
      r.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Export reservations to JSON
   */
  async exportToJSON(reservations: Reservation[]): Promise<string> {
    if (reservations.length === 0) {
      throw new Error('No reservations to export');
    }

    const exportData = reservations.map(r => ({
      space_name: r.space?.name || r.space_name || '',
      space_type: r.space?.type || r.space_type || '',
      space_id: r.space_id,
      user_id: r.user_id,
      user_name: r.user_name || '',
      date: r.date.split('T')[0],
      start_time: this.normalizeTime(r.start_time || ''),
      end_time: this.normalizeTime(r.end_time || ''),
      notes: r.notes || '',
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import reservations from CSV or JSON
   */
  async importFromFile(
    file: File,
    selectedDate: string,
    spaces: Array<{ id: string; name: string; type: string }>
  ): Promise<{ successCount: number; errorCount: number }> {
    const fileContent = await file.text();
    const isJSON = file.name.endsWith('.json');

    let importData: any[];

    if (isJSON) {
      importData = JSON.parse(fileContent);
    } else {
      // Parse CSV
      const lines = fileContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row');
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const spaceNameIndex = headers.indexOf('Space Name');
      const spaceIdIndex = headers.indexOf('Space ID');
      const userIdIndex = headers.indexOf('User ID');
      const dateIndex = headers.indexOf('Date');

      if (spaceNameIndex === -1 && spaceIdIndex === -1) {
        throw new Error('CSV file must have columns: Space Name or Space ID, User ID, Date');
      }

      importData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        return {
          space_name: spaceNameIndex >= 0 ? values[spaceNameIndex] : '',
          space_id: spaceIdIndex >= 0 ? values[spaceIdIndex] : '',
          user_id: userIdIndex >= 0 ? values[userIdIndex] : '',
          user_name: headers.indexOf('User Name') >= 0 ? values[headers.indexOf('User Name')] : '',
          date: dateIndex >= 0 ? values[dateIndex] : selectedDate,
          start_time: headers.indexOf('Start Time') >= 0 ? values[headers.indexOf('Start Time')] : '',
          end_time: headers.indexOf('End Time') >= 0 ? values[headers.indexOf('End Time')] : '',
          notes: headers.indexOf('Notes') >= 0 ? values[headers.indexOf('Notes')] : '',
        };
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of importData) {
      try {
        // Find space by name first, then by ID
        let space = spaces.find(s => s.name === item.space_name);
        if (!space && item.space_id) {
          space = spaces.find(s => s.id === item.space_id);
        }

        if (!space) {
          throw new Error(`Space "${item.space_name || item.space_id}" not found`);
        }

        // Normalize time
        const startTime = item.start_time ? this.normalizeTime(item.start_time) : undefined;
        const endTime = item.end_time ? this.normalizeTime(item.end_time) : undefined;

        await services.reservation.createReservation({
          space_id: space.id,
          user_id: item.user_id,
          user_name: item.user_name || '',
          date: selectedDate, // Always use selected date
          start_time: startTime,
          end_time: endTime,
          notes: item.notes || '',
        });

        successCount++;
      } catch (error: any) {
        console.error('Error importing reservation:', error);
        errorCount++;
      }
    }

    return { successCount, errorCount };
  }

  /**
   * Clear all reservations for a date
   */
  async clearDay(reservations: Reservation[]): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const reservation of reservations) {
      try {
        await services.reservation.deleteReservation(reservation.id);
        successCount++;
      } catch (error) {
        console.error('Error deleting reservation:', error);
        errorCount++;
      }
    }

    return { successCount, errorCount };
  }
}

