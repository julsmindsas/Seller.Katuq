import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FlowsService } from '../services/flows.service';

@Component({
  selector: 'app-flow-diff',
  templateUrl: './flow-diff.component.html',
  styleUrls: ['./flow-diff.component.scss']
})
export class FlowDiffComponent implements OnInit {
  flowId = '';
  versions: any[] = [];
  fromVersion: number | null = null;
  toVersion: number | null = null;
  diff: any = null;
  fromFlow: any = null;
  toFlow: any = null;
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowsService: FlowsService
  ) {}

  ngOnInit(): void {
    this.flowId = this.route.snapshot.paramMap.get('id') || '';
    this.loadVersions();
  }

  loadVersions(): void {
    this.flowsService.listVersions(this.flowId).subscribe({
      next: (versions) => {
        this.versions = versions || [];
        if (this.versions.length >= 2) {
          this.fromVersion = this.versions[1].version;
          this.toVersion = this.versions[0].version;
          this.computeDiff();
        }
      },
      error: (err) => { this.error = err.message; }
    });
  }

  computeDiff(): void {
    if (!this.fromVersion || !this.toVersion) return;
    this.loading = true;
    this.error = null;
    this.flowsService.diff(this.flowId, this.fromVersion, this.toVersion).subscribe({
      next: (result: any) => {
        this.diff = result;
        this.fromFlow = result?.from;
        this.toFlow = result?.to;
        this.loading = false;
      },
      error: (err) => { this.error = err.message; this.loading = false; }
    });
  }

  rollback(version: number): void {
    if (!confirm(`¿Hacer rollback a la versión ${version}? Esta acción crea una nueva versión copiando la anterior.`)) return;
    this.flowsService.rollback(this.flowId, version).subscribe({
      next: () => { this.router.navigate(['/flows/editor', this.flowId]); },
      error: (err) => { this.error = err.message; }
    });
  }

  back(): void {
    this.router.navigate(['/flows/editor', this.flowId]);
  }
}
