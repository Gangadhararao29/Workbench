import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeedbackComponent } from './feedback';
import { FeedbackService } from '../../core/feedback.service';

describe('FeedbackComponent', () => {
  let component: FeedbackComponent;
  let fixture: ComponentFixture<FeedbackComponent>;
  let feedbackService: FeedbackService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackComponent],
      providers: [FeedbackService]
    }).compileComponents();

    feedbackService = TestBed.inject(FeedbackService);
    fixture = TestBed.createComponent(FeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.activeType()).toBe('feedback');
    expect(component.status()).toBe('form');
  });

  it('switches between feedback and bug report mode', () => {
    component.setType('bug');
    expect(component.activeType()).toBe('bug');
    expect(component.category()).toBe('Incorrect Output / Result');
    expect(component.includeSystemInfo()).toBe(true);

    component.setType('feedback');
    expect(component.activeType()).toBe('feedback');
    expect(component.category()).toBe('Feature Request');
  });

  it('validates form fields before submission', () => {
    expect(component.isFormValid()).toBe(false);

    component.title.set('AB'); // too short (< 3)
    component.description.set('Test'); // too short (< 5)
    expect(component.isFormValid()).toBe(false);

    component.title.set('Valid Feature Title');
    component.description.set('This is a detailed and valid description of the feature request.');
    expect(component.isFormValid()).toBe(true);
  });

  it('sets rating and severity appropriately', () => {
    component.setRating(4);
    expect(component.rating()).toBe(4);
    component.setRating(4); // toggle off
    expect(component.rating()).toBe(0);

    component.setSeverity('critical');
    expect(component.severity()).toBe('critical');
  });

  it('submits feedback successfully and transitions to success state', async () => {
    component.title.set('New feature idea');
    component.description.set('Please support dark theme customization');
    component.setRating(5);

    const submitSpy = vi.spyOn(feedbackService, 'submitFeedback').mockResolvedValue({
      success: true,
      id: 'fb_test_123'
    });

    await component.submit();

    expect(submitSpy).toHaveBeenCalled();
    expect(component.status()).toBe('success');
    expect(component.submittedId()).toBe('fb_test_123');
  });

  it('resets form when resetForm is called', async () => {
    vi.spyOn(feedbackService, 'submitFeedback').mockResolvedValue({
      success: true,
      id: 'fb_test_456'
    });
    component.title.set('Some title');
    component.description.set('Some description text here');
    await component.submit();
    expect(component.status()).toBe('success');

    component.resetForm();
    expect(component.status()).toBe('form');
    expect(component.title()).toBe('');
    expect(component.description()).toBe('');
  });
});
