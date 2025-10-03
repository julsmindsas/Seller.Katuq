import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NavService, Menu } from '../../../../services/nav.service';

@Component({
  selector: 'app-mega-menu',
  templateUrl: './mega-menu.component.html',
  styleUrls: ['./mega-menu.component.scss']
})
export class MegaMenuComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public megaItems: Menu[];
  public levelmenuitems: Menu[];

  constructor(public navServices: NavService) { }

  ngOnInit() {
    this.navServices.megaItems
      .pipe(takeUntil(this.destroy$))
      .subscribe(megaItems => this.megaItems = megaItems);

    this.navServices.levelmenuitems
      .pipe(takeUntil(this.destroy$))
      .subscribe(levelmenuitems => this.levelmenuitems = levelmenuitems);
  }

  megaMenuToggle() {
    this.navServices.levelMenu = false;
    this.navServices.megaMenu  = !this.navServices.megaMenu;
    if(window.innerWidth < 991) { 
      this.navServices.collapseSidebar = true;
    }
  }

  levelMenuToggle() {
    this.navServices.megaMenu  = false;
    this.navServices.levelMenu = !this.navServices.levelMenu;
    if(window.innerWidth < 991) { 
      this.navServices.collapseSidebar = true;
    }
  }

  // Click Toggle menu
  toggletNavActive(item) {
    if (!item.active) {
      this.megaItems.forEach(a => {
        if (this.megaItems.includes(item)) {
          a.active = false;
        }
        if (!a.children) { return; }
        a.children.forEach(b => {
          if (a.children.includes(item)) {
            b.active = false;
          }
        });
      });
    }
    item.active = !item.active;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
