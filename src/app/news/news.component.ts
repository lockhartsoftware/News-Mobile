import { Component, OnInit } from '@angular/core';
import { News } from './models/news';
import { Subscription } from 'rxjs';
import { NewsType } from './models/news-types.enum';
import { AlertController, IonRefresher, NavController } from '@ionic/angular';
import { NewsService } from './services/news.service';
import { NewsSignalrService } from './services/news-signalr.service';

import { zip } from 'rxjs';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit {
  protected allNews: Array<News>;
  newsTypes: Array<NewsType>;
  selectedNewsType: NewsType;
  loaded = false;
  getUpdatedNewsSubscription: Subscription;
  newsSubscription: Subscription;

  constructor(
    public navCtrl: NavController,
    public alertController: AlertController,
    private newsService: NewsService,
    private signalRService: NewsSignalrService
  ) { }

  ionViewDidEnter() {
    const getAllNews = this.newsService.getAllNews();
    const getAllNewsTypes = this.newsService.getAllNewsTypes();

    this.newsSubscription = zip(getAllNews, getAllNewsTypes).subscribe(
      ([news, newsTypes]) => {
        this.allNews = news;
        this.newsTypes = newsTypes;
        this.signalRService.startConnection();
        this.signalRService.addNewsDataListener();
        this.getUpdatedNewsSubscription = this.signalRService.getUpdatedNews().subscribe(newNews => {
          if (newNews) {
            // remove old version of updated news to prevent duplicate news
            this.allNews = this.removeOldNews(this.allNews, newNews);
            this.allNews.push(newNews);
          }
          this.loaded = true;
        });
      },
      () => {
        this.presentAlert('Cannot get news right now, please try again later. 😇');
      }
    );
  }

  ionViewWillLeave() {
    this.signalRService.stopConnection();
    this.getUpdatedNewsSubscription.unsubscribe();
    this.newsSubscription.unsubscribe();
  }

  itemTapped(event, item: News) {
    // this.navCtrl.push(NewsDetailsPage, {
    //   item: item
    // });
  }

  async presentAlert(message: string) {
    const alert = await this.alertController.create({
      subHeader: 'Oops!',
      message,
      buttons: ['OK']
    });

    alert.onDidDismiss().then(() => (this.loaded = true));

    await alert.present();
  }

  onNewsTypeChange() {
    if (this.selectedNewsType) {
      if (this.selectedNewsType.toString() === 'None') {
        this.allNews.map(news => (news.hidden = false));
      } else {
        this.allNews.map(news => {
          if (news.type) {
            news.hidden = news.type !== this.selectedNewsType;
          }
        });
      }
    }
  }

  refreshNews(event: CustomEvent<IonRefresher>) {
    this.newsService.getAllNews().subscribe(news => {
      this.allNews = news;
      event.detail.complete();
    });
  }

  ngOnInit() {
  }

  /**
   * This method removes the old news from `allNews` array, adds updated news to it and returns new array.
   * @param allNews All news, including old version of updated news
   * @param newNews Updated and news to be added to all news
   */
  removeOldNews(allNews: Array<News>, newNews: News) {
    let newNewsArray = [...allNews];
    const oldVersionOfUpdatedNews = this.allNews.find(news => news.id === newNews.id);
    if (oldVersionOfUpdatedNews) {
      newNewsArray = allNews.filter(news => news !== oldVersionOfUpdatedNews);
    }
    return newNewsArray;
  }

}
