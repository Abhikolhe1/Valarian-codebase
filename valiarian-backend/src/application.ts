import {AuthenticationComponent, registerAuthenticationStrategy} from '@loopback/authentication';
import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import multer from 'multer';
import path from 'path';
import {JWTStrategy} from './authentication-strategy/jwt-strategy';
import {EmailManagerBindings, FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY} from './keys';
import {MySequence} from './sequence';
import {AuditService} from './services/audit.service';
import {CacheService} from './services/cache.service';
import {CMSService} from './services/cms.service';
import {EmailTemplateService} from './services/email-template.service';
import {EmailService} from './services/email.service';
import {GoogleOAuthService} from './services/google-oauth.service';
import {BcryptHasher} from './services/hash.password.bcrypt';
import {InvoiceGeneratorService} from './services/invoice-generator.service';
import {JWTService} from './services/jwt-service';
import {MediaService} from './services/media.service';
import {OtpNotificationService} from './services/otp-notification.service';
import {PendingOrderCleanupService} from './services/pending-order-cleanup.service';
import {PremiumPreorderExpiryService} from './services/premium-preorder-expiry.service';
import {RateLimiterService} from './services/rate-limiter.service';
import {RazorpayService} from './services/razorpay.service';
import {RbacService} from './services/rbac.service';
import {SessionService} from './services/session.service';
import {SlugService} from './services/slug.service';
import {TokenBlacklistService} from './services/token-blacklist.service';
import {UserProfileService} from './services/user-profile.service';
import {MyUserService} from './services/user-service';
export {ApplicationConfig};

export class ValiarianBackendApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    this.component(AuthenticationComponent);

    // Set up the custom sequence
    this.sequence(MySequence);
    this.setUpBinding();

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Serve uploaded media files
    const uploadsPath = process.env.STORAGE_PATH || path.join(__dirname, '../uploads');
    this.static('/media', path.join(uploadsPath, 'media'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);
    this.configureFileUpload(options.fileStorageDirectory);
    registerAuthenticationStrategy(this, JWTStrategy);
    this.lifeCycleObserver(PendingOrderCleanupService);
    this.lifeCycleObserver(PremiumPreorderExpiryService);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  setUpBinding(): void {
    this.bind('service.hasher').toClass(BcryptHasher);
    this.bind('services.rbac').toClass(RbacService);
    this.bind('services.cache').toClass(CacheService);
    this.bind('services.cms').toClass(CMSService);
    this.bind('services.audit').toClass(AuditService);
    this.bind('services.SlugService').toClass(SlugService);
    this.bind('service.rate.limiter').toClass(RateLimiterService);
    this.bind('services.token-blacklist').toClass(TokenBlacklistService);
    this.bind('service.user.profile').toClass(UserProfileService);
    this.bind('services.razorpay').toClass(RazorpayService);
    this.bind('jwt.secret').to(process.env.JWT_SECRET!);
    this.bind('jwt.expiresIn').to(process.env.JWT_EXPIRES_IN ?? '7h');
    this.bind('service.jwt.service').toClass(JWTService);
    this.bind('service.user.service').toClass(MyUserService);
    this.bind('service.media.service').toClass(MediaService);
    this.bind('service.session.service').toClass(SessionService);
    this.bind('service.google.oauth').toClass(GoogleOAuthService);
    this.bind(EmailManagerBindings.SEND_MAIL).toClass(EmailService);
    this.bind('services.email').toClass(EmailService);
    this.bind('services.email.template').toClass(EmailTemplateService);
    this.bind('services.invoice.generator').toClass(InvoiceGeneratorService);
    this.bind('services.otp.notification').toClass(OtpNotificationService);

    if (process.env.PENDING_ORDER_CLEANUP_HOURS !== undefined) {
      this.bind('services.pending.order.cleanup.hours').to(
        Number(process.env.PENDING_ORDER_CLEANUP_HOURS),
      );
    }

    if (process.env.PENDING_ORDER_CLEANUP_INTERVAL_MS !== undefined) {
      this.bind('services.pending.order.cleanup.interval.ms').to(
        Number(process.env.PENDING_ORDER_CLEANUP_INTERVAL_MS),
      );
    }

    if (process.env.PREMIUM_PREORDER_EXPIRY_MINUTES !== undefined) {
      this.bind('services.premium.preorder.expiry.minutes').to(
        Number(process.env.PREMIUM_PREORDER_EXPIRY_MINUTES),
      );
    }

    if (process.env.PREMIUM_PREORDER_EXPIRY_INTERVAL_MS !== undefined) {
      this.bind('services.premium.preorder.expiry.interval.ms').to(
        Number(process.env.PREMIUM_PREORDER_EXPIRY_INTERVAL_MS),
      );
    }
  }

  protected configureFileUpload(destination?: string) {
    destination = destination ?? path.join(__dirname, '../uploads');
    this.bind(STORAGE_DIRECTORY).to(destination);

    const multerOptions: multer.Options = {
      storage: multer.diskStorage({
        destination,
        filename: (req, file, cb) => {
          const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
          const fileName = `${timestamp}_${file.originalname}`;
          cb(null, fileName);
        },
      }),
    };

    this.configure(FILE_UPLOAD_SERVICE).to(multerOptions);
  }
}
