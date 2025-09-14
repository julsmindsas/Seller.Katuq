import { Component, OnInit } from "@angular/core";
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from "@angular/animations";
import { LoaderService } from "../../shared/services/loader.service";
import { Observable } from "rxjs";

@Component({
  selector: "app-loader-custom",
  templateUrl: "./loader.component.html",
  styleUrls: ["./loader.component.scss"],
  animations: [
    trigger("loaderAnimation", [
      state(
        "void",
        style({
          opacity: 0,
          transform: "scale(0.95)",
        }),
      ),
      transition("void <=> *", [animate("200ms ease-in-out")]),
    ]),
  ],
})
export class LoaderComponent implements OnInit {
  isLoading$: Observable<boolean>;

  constructor(private loaderService: LoaderService) {}

  ngOnInit(): void {
    this.isLoading$ = this.loaderService.loading$;
  }
}
