import { Router } from 'express';
import { repository } from '../data/repository.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const profileRouter = Router();

profileRouter.get('/profile', asyncRoute(async (req, res) => {
  const userId = req.actor?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const user = await repository.users.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { passwordHash, ...profile } = user;
  res.json(profile);
}));

profileRouter.put('/profile', asyncRoute(async (req, res) => {
  const userId = req.actor?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const {
    dob, age, gender, bloodGroup, height, weight,
    conditions, allergies, emergencyContactName,
    emergencyContactPhone, emergencyContactRelation,
    dietaryPreference, mobilityStatus,
    medicalFiles, profileComplete: explicitComplete
  } = req.body;

  // Mark profile complete if basic info, allergies, or conditions are provided or explicitly confirmed
  const profileComplete = explicitComplete !== undefined
    ? Boolean(explicitComplete)
    : Boolean(
        (dob || age) ||
        (height && weight) ||
        (Array.isArray(conditions) && conditions.length > 0) ||
        (Array.isArray(allergies) && allergies.length > 0) ||
        emergencyContactName
      );

  const changes = {
    dob: dob || null,
    age: age ? Number(age) : null,
    gender: gender || null,
    bloodGroup: bloodGroup || null,
    height: height ? Number(height) : null,
    weight: weight ? Number(weight) : null,
    conditions: Array.isArray(conditions) ? conditions : [],
    allergies: Array.isArray(allergies) ? allergies : [],
    emergencyContactName: emergencyContactName || null,
    emergencyContactPhone: emergencyContactPhone || null,
    emergencyContactRelation: emergencyContactRelation || null,
    dietaryPreference: dietaryPreference || null,
    mobilityStatus: mobilityStatus || null,
    medicalFiles: Array.isArray(medicalFiles) ? medicalFiles : [],
    profileComplete
  };

  const updatedUser = await repository.users.update(userId, changes);
  if (!updatedUser) return res.status(404).json({ error: 'User not found' });

  const { passwordHash, ...profile } = updatedUser;
  res.json(profile);
}));
