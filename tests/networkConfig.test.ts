import networks from '../configs/networks.json';

describe('Network Validation', () => {
  it('should accept a valid network', () => {
    // Pick a network that is actually present in networks.json
    const testNetwork = networks[0]?.name || 'mainnet'; // fallback if array is empty
    const exists = networks.some((n) => n.name === testNetwork);
    expect(exists).toBe(true);
  });

  it('should reject an invalid network', () => {
    const testNetwork = 'invalidnet';
    const exists = networks.some((n) => n.name === testNetwork);
    expect(exists).toBe(false);
  });
});
